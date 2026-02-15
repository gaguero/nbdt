'use client';

import { useState } from 'react';
import Button from './Button';
import { Card, CardHeader, CardBody, CardFooter } from './Card';
import Input from './Input';
import Modal from './Modal';
import { useToast } from './Toast';

export default function ComponentShowcase() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const { showToast, ToastContainer } = useToast();

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (emailError) setEmailError('');
  };

  const validateEmail = () => {
    if (!email) {
      setEmailError('Email is required');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError('Please enter a valid email');
      return false;
    }
    return true;
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-12">
        <div>
          <h1 className="text-h1 font-heading text-foreground mb-2">Component Showcase</h1>
          <p className="text-body text-muted-foreground">
            A comprehensive demo of all UI components in the Nayara Ordering System
          </p>
        </div>

        <section>
          <h2 className="text-h2 font-heading text-foreground mb-6">Buttons</h2>
          <div className="flex flex-wrap gap-4">
            <Button variant="primary">Primary Button</Button>
            <Button variant="secondary">Secondary Button</Button>
            <Button variant="outline">Outline Button</Button>
            <Button variant="ghost">Ghost Button</Button>
            <Button variant="danger">Danger Button</Button>
          </div>
          <div className="flex flex-wrap gap-4 mt-4">
            <Button variant="primary" size="sm">Small</Button>
            <Button variant="primary" size="md">Medium</Button>
            <Button variant="primary" size="lg">Large</Button>
          </div>
          <div className="flex flex-wrap gap-4 mt-4">
            <Button variant="primary" isLoading>Loading...</Button>
            <Button variant="primary" disabled>Disabled</Button>
          </div>
        </section>

        <section>
          <h2 className="text-h2 font-heading text-foreground mb-6">Cards</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <h3 className="text-h3 font-heading">Simple Card</h3>
              </CardHeader>
              <CardBody>
                <p className="text-body">This is a basic card with header and body.</p>
              </CardBody>
            </Card>

            <Card hover>
              <CardHeader>
                <h3 className="text-h3 font-heading">Hover Card</h3>
              </CardHeader>
              <CardBody>
                <p className="text-body">This card has a hover effect.</p>
              </CardBody>
              <CardFooter>
                <Button variant="outline" size="sm">Learn More</Button>
              </CardFooter>
            </Card>

            <Card>
              <CardBody>
                <h3 className="text-h3 font-heading mb-2">No Header</h3>
                <p className="text-body">A card without a header section.</p>
              </CardBody>
            </Card>
          </div>
        </section>

        <section>
          <h2 className="text-h2 font-heading text-foreground mb-6">Inputs</h2>
          <div className="max-w-md space-y-6">
            <Input
              label="Email Address"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={handleEmailChange}
              error={emailError}
              helperText="Enter your email to receive updates"
              fullWidth
            />
            <Button
              onClick={() => {
                if (validateEmail()) {
                  showToast('Email validated successfully!', 'success');
                } else {
                  showToast('Please enter a valid email', 'error');
                }
              }}
            >
              Validate Email
            </Button>

            <Input
              label="Password"
              type="password"
              placeholder="Enter password"
              fullWidth
            />

            <Input
              label="Disabled Input"
              value="Cannot edit this"
              disabled
              fullWidth
            />
          </div>
        </section>

        <section>
          <h2 className="text-h2 font-heading text-foreground mb-6">Modal</h2>
          <Button onClick={() => setIsModalOpen(true)}>Open Modal</Button>

          <Modal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            title="Example Modal"
            size="md"
          >
            <div className="space-y-4">
              <p className="text-body">
                This is a modal dialog with a title and close button. You can close it by:
              </p>
              <ul className="list-disc list-inside text-body space-y-2 ml-4">
                <li>Clicking the X button</li>
                <li>Clicking outside the modal</li>
                <li>Pressing the Escape key</li>
              </ul>
              <div className="flex justify-end gap-4 pt-4">
                <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    setIsModalOpen(false);
                    showToast('Modal action confirmed!', 'success');
                  }}
                >
                  Confirm
                </Button>
              </div>
            </div>
          </Modal>
        </section>

        <section>
          <h2 className="text-h2 font-heading text-foreground mb-6">Toasts</h2>
          <div className="flex flex-wrap gap-4">
            <Button
              variant="primary"
              onClick={() => showToast('This is a success message!', 'success')}
            >
              Show Success
            </Button>
            <Button
              variant="primary"
              onClick={() => showToast('This is an error message!', 'error')}
            >
              Show Error
            </Button>
            <Button
              variant="primary"
              onClick={() => showToast('This is a warning message!', 'warning')}
            >
              Show Warning
            </Button>
            <Button
              variant="primary"
              onClick={() => showToast('This is an info message!', 'info')}
            >
              Show Info
            </Button>
          </div>
        </section>

        <section className="pb-12">
          <h2 className="text-h2 font-heading text-foreground mb-6">Full Width Examples</h2>
          <div className="space-y-4 max-w-md">
            <Button variant="primary" fullWidth>Full Width Primary</Button>
            <Button variant="outline" fullWidth>Full Width Outline</Button>
          </div>
        </section>
      </div>

      <ToastContainer />
    </div>
  );
}
