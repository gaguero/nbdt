# Component Quick Reference

A quick cheat sheet for using the Nayara Ordering System components.

## Import Patterns

```tsx
// UI Components (all in one)
import { Button, Card, Input, Modal, useToast } from '@/components/ui';

// Layout Components
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

// i18n
import LanguageSwitcher from '@/components/i18n/LanguageSwitcher';

// next-intl hooks
import { useTranslations } from 'next-intl';
```

## Button

```tsx
// Basic usage
<Button>Click Me</Button>

// Variants
<Button variant="primary">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="danger">Delete</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="md">Medium</Button>
<Button size="lg">Large</Button>

// States
<Button isLoading>Processing...</Button>
<Button disabled>Disabled</Button>
<Button fullWidth>Full Width</Button>
```

## Card

```tsx
import { Card, CardHeader, CardBody, CardFooter } from '@/components/ui';

<Card hover>
  <CardHeader>
    <h3 className="text-h3 font-heading">Title</h3>
  </CardHeader>
  <CardBody>
    <p>Content goes here</p>
  </CardBody>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>
```

## Input

```tsx
// Basic
<Input
  label="Email"
  type="email"
  placeholder="you@example.com"
/>

// With error
<Input
  label="Password"
  type="password"
  error="Password too short"
/>

// With helper text
<Input
  label="Username"
  helperText="Choose a unique username"
/>

// Controlled
const [value, setValue] = useState('');
<Input
  value={value}
  onChange={(e) => setValue(e.target.value)}
/>
```

## Modal

```tsx
const [isOpen, setIsOpen] = useState(false);

<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Confirmation"
  size="md"
>
  <p>Are you sure?</p>
  <div className="flex gap-4 mt-4">
    <Button onClick={() => setIsOpen(false)}>Cancel</Button>
    <Button variant="primary">Confirm</Button>
  </div>
</Modal>
```

## Toast

```tsx
function MyComponent() {
  const { showToast, ToastContainer } = useToast();

  return (
    <>
      <Button onClick={() => showToast('Success!', 'success')}>
        Show Toast
      </Button>

      <ToastContainer />
    </>
  );
}

// Variants
showToast('Success message', 'success');
showToast('Error message', 'error');
showToast('Warning message', 'warning');
showToast('Info message', 'info');

// Custom duration (in milliseconds)
showToast('Custom duration', 'info', 10000);
```

## Navbar

```tsx
<Navbar cartItemCount={5} />
```

## Footer

```tsx
<Footer />
```

## Language Switcher

```tsx
<LanguageSwitcher />
```

## Translations (next-intl)

```tsx
'use client';
import { useTranslations } from 'next-intl';

function MyComponent() {
  const t = useTranslations('navigation');

  return <h1>{t('home')}</h1>;
}
```

## Common Tailwind Classes

### Colors
```tsx
// Brand colors
className="bg-brand-primary text-brand-white"
className="bg-brand-accent text-accent-foreground"
className="bg-brand-cream text-foreground"

// Status colors
className="text-success"
className="text-error"
className="text-warning"
```

### Typography
```tsx
className="text-h1 font-heading"  // Large heading
className="text-h2 font-heading"  // Medium heading
className="text-h3 font-heading"  // Small heading
className="text-body"             // Body text
className="text-caption"          // Small text
```

### Spacing
```tsx
className="px-content"     // Horizontal content padding
className="py-section"     // Vertical section padding
```

### Layout
```tsx
className="max-w-7xl mx-auto"  // Centered container
className="space-y-4"          // Vertical spacing
className="flex gap-4"         // Flex with gap
className="grid grid-cols-3 gap-6"  // Grid layout
```

## Page Layout Template

```tsx
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export default function Page() {
  return (
    <>
      <Navbar cartItemCount={0} />

      <main className="min-h-screen bg-background pt-20">
        <div className="max-w-7xl mx-auto px-content py-section">
          {/* Your content */}
        </div>
      </main>

      <Footer />
    </>
  );
}
```

## Form Example

```tsx
'use client';
import { useState } from 'react';
import { Button, Input, useToast } from '@/components/ui';

export default function MyForm() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const { showToast, ToastContainer } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      setError('Email is required');
      return;
    }

    // Process form...
    showToast('Form submitted!', 'success');
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError('');
          }}
          error={error}
          fullWidth
        />

        <Button type="submit" fullWidth>
          Submit
        </Button>
      </form>

      <ToastContainer />
    </>
  );
}
```

## Card Grid Example

```tsx
import { Card, CardBody } from '@/components/ui';

const items = [1, 2, 3, 4, 5, 6];

<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {items.map((item) => (
    <Card key={item} hover>
      <CardBody>
        <h3 className="text-h3 font-heading mb-2">Item {item}</h3>
        <p className="text-body">Description here</p>
      </CardBody>
    </Card>
  ))}
</div>
```

## Responsive Design Breakpoints

```tsx
// Mobile first approach
className="text-sm md:text-base lg:text-lg"
className="grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
className="hidden md:block"
className="block md:hidden"
```

## Common Patterns

### Loading State
```tsx
const [isLoading, setIsLoading] = useState(false);

<Button isLoading={isLoading} onClick={async () => {
  setIsLoading(true);
  await someAsyncOperation();
  setIsLoading(false);
}}>
  Submit
</Button>
```

### Confirmation Modal
```tsx
const [showConfirm, setShowConfirm] = useState(false);

<>
  <Button variant="danger" onClick={() => setShowConfirm(true)}>
    Delete
  </Button>

  <Modal
    isOpen={showConfirm}
    onClose={() => setShowConfirm(false)}
    title="Confirm Delete"
  >
    <p>Are you sure you want to delete this item?</p>
    <div className="flex justify-end gap-4 mt-6">
      <Button variant="ghost" onClick={() => setShowConfirm(false)}>
        Cancel
      </Button>
      <Button variant="danger" onClick={handleDelete}>
        Delete
      </Button>
    </div>
  </Modal>
</>
```

### Form with Validation
```tsx
const [formData, setFormData] = useState({ email: '', password: '' });
const [errors, setErrors] = useState({ email: '', password: '' });

const validate = () => {
  const newErrors = { email: '', password: '' };

  if (!formData.email) newErrors.email = 'Email is required';
  if (!formData.password) newErrors.password = 'Password is required';

  setErrors(newErrors);
  return !newErrors.email && !newErrors.password;
};

<form onSubmit={(e) => {
  e.preventDefault();
  if (validate()) {
    // Submit form
  }
}}>
  <Input
    label="Email"
    type="email"
    value={formData.email}
    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
    error={errors.email}
  />
  <Input
    label="Password"
    type="password"
    value={formData.password}
    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
    error={errors.password}
  />
  <Button type="submit">Submit</Button>
</form>
```

---

For complete documentation, see `src/components/README.md`
