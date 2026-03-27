import { render } from '@testing-library/react';
import { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent, CardFooter } from '../components/card';

import { describe, it, expect } from 'vitest';

describe('Card', () => {
  it('rend le composant Card', () => {
    const { getByText } = render(<Card>Contenu</Card>);
    expect(getByText('Contenu')).toBeInTheDocument();
  });

  it('rend CardHeader, CardTitle, CardDescription, CardAction, CardContent, CardFooter', () => {
    const { getByText } = render(
      <Card>
        <CardHeader>Header</CardHeader>
        <CardTitle>Title</CardTitle>
        <CardDescription>Description</CardDescription>
        <CardAction>Action</CardAction>
        <CardContent>Content</CardContent>
        <CardFooter>Footer</CardFooter>
      </Card>
    );
    expect(getByText('Header')).toBeInTheDocument();
    expect(getByText('Title')).toBeInTheDocument();
    expect(getByText('Description')).toBeInTheDocument();
    expect(getByText('Action')).toBeInTheDocument();
    expect(getByText('Content')).toBeInTheDocument();
    expect(getByText('Footer')).toBeInTheDocument();
  });
});
