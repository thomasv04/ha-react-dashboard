import type { Meta, StoryObj } from '@storybook/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, CardAction } from './card';
import { Button } from './button';

const meta: Meta<typeof Card> = {
  title: 'UI/Card',
  component: Card,
  argTypes: {
    size: { control: 'radio', options: ['default', 'sm'] },
  },
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
  render: args => (
    <Card {...args}>
      <CardHeader>
        <CardTitle>Titre de la carte</CardTitle>
        <CardDescription>Description optionnelle de la carte.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className='text-sm text-muted-foreground'>Contenu de la carte ici.</p>
      </CardContent>
    </Card>
  ),
};

export const Small: Story = {
  render: () => (
    <Card size='sm'>
      <CardHeader>
        <CardTitle>Carte compacte</CardTitle>
        <CardDescription>Taille réduite.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className='text-sm text-muted-foreground'>Contenu compact.</p>
      </CardContent>
    </Card>
  ),
};

export const WithAction: Story = {
  render: () => (
    <Card>
      <CardHeader>
        <CardTitle>Avec action</CardTitle>
        <CardDescription>Action dans l&apos;en-tête.</CardDescription>
        <CardAction>
          <Button size='sm' variant='outline'>
            Modifier
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p className='text-sm text-muted-foreground'>Contenu de la carte.</p>
      </CardContent>
    </Card>
  ),
};

export const WithFooter: Story = {
  render: () => (
    <Card>
      <CardHeader>
        <CardTitle>Avec pied de page</CardTitle>
      </CardHeader>
      <CardContent>
        <p className='text-sm text-muted-foreground'>Contenu principal.</p>
      </CardContent>
      <CardFooter>
        <div className='flex gap-2 ml-auto'>
          <Button variant='outline' size='sm'>
            Annuler
          </Button>
          <Button size='sm'>Confirmer</Button>
        </div>
      </CardFooter>
    </Card>
  ),
};
