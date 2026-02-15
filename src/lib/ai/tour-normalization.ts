import { GoogleGenerativeAI } from '@google/generative-ai';
import { query } from '@/lib/db';

const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export interface TourMappingSuggestion {
  original_name: string;
  suggested_product_id: string | null;
  confidence: number;
  reason: string;
}

/**
 * Analyzes unmapped tour names from the tour_name_mappings table
 * using Gemini AI to suggest matches from the tour_products table.
 */
export async function analyzeTourNames() {
  if (!genAI) {
    return { error: 'GEMINI_API_KEY is not set in environment variables' };
  }

  try {
    // 1. Get all active tour products to use as reference
    const productsRes = await query(
      'SELECT id, name_en, name_es FROM tour_products WHERE is_active = true'
    );
    const products = productsRes.rows;

    if (products.length === 0) {
      return { error: 'No active tour products found to match against' };
    }

    // 2. Get tour names that need analysis
    // (those without a confirmed mapping and not recently updated with high confidence)
    const unmappedRes = await query(
      `SELECT original_name 
       FROM tour_name_mappings 
       WHERE confirmed_product_id IS NULL 
       AND is_ignored = false
       AND (confidence_score IS NULL OR confidence_score < 0.9)
       LIMIT 100`
    );
    const unmappedNames = unmappedRes.rows.map(r => r.original_name);

    if (unmappedNames.length === 0) {
      return { message: 'No tour names found that require analysis', count: 0 };
    }

    // 3. Batch process names with AI (Gemini 1.5 Flash is good for this)
    const batchSize = 25;
    let processedCount = 0;

    for (let i = 0; i < unmappedNames.length; i += batchSize) {
      const batch = unmappedNames.slice(i, i + batchSize);
      await analyzeBatch(batch, products);
      processedCount += batch.length;
    }

    return { 
      message: 'AI analysis completed successfully', 
      processed: processedCount,
      total_unmapped: unmappedNames.length 
    };
  } catch (error: any) {
    console.error('[AI Normalization] Error:', error);
    return { error: error.message };
  }
}

async function analyzeBatch(names: string[], products: any[]) {
  if (!genAI) return;
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const productsList = products.map(p => 
    `- ID: ${p.id} | Name: ${p.name_en} / ${p.name_es}`
  ).join('\n');

  const namesList = names.join('\n');

  const prompt = `
    You are an expert data normalization assistant for a luxury hotel's tour booking system.
    We are migrating legacy data where tour names were entered inconsistently.
    
    TASK:
    Map the "LEGACY NAMES" to our "OFFICIAL PRODUCTS".
    
    OFFICIAL PRODUCTS:
    ${productsList}
    
    LEGACY NAMES TO MAP:
    ${namesList}
    
    INSTRUCTIONS:
    1. For each legacy name, find the most likely match in the official products list.
    2. If a match is found, provide the product ID.
    3. Provide a confidence score from 0.0 (no match) to 1.0 (exact match).
    4. Provide a brief reason for the match.
    5. If no match is plausible, return null for suggested_product_id.
    
    OUTPUT FORMAT:
    Return ONLY a valid JSON array of objects with this structure:
    [
      {
        "original_name": "string",
        "suggested_product_id": "uuid or null",
        "confidence": number,
        "reason": "string"
      }
    ]
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Extract JSON from response (handling potential markdown blocks)
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.warn('[AI Normalization] Could not find JSON in AI response', text);
      return;
    }

    const suggestions: TourMappingSuggestion[] = JSON.parse(jsonMatch[0]);

    // 4. Update the database with suggestions
    for (const sug of suggestions) {
      if (sug.suggested_product_id) {
        await query(
          `UPDATE tour_name_mappings
           SET suggested_product_id = $1, 
               confidence_score = $2, 
               updated_at = NOW()
           WHERE original_name = $3 AND confirmed_product_id IS NULL`,
          [sug.suggested_product_id, sug.confidence, sug.original_name]
        );
      }
    }
  } catch (error) {
    console.error('[AI Normalization] Batch error:', error);
  }
}
