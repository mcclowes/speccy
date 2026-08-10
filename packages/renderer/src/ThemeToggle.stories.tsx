import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { ThemeToggle, type Theme } from './ThemeToggle';

function InteractiveThemeToggle({ initialTheme }: { initialTheme: Theme }) {
  const [theme, setTheme] = useState(initialTheme);
  return <ThemeToggle theme={theme} onChange={setTheme} />;
}

const meta = {
  title: 'Renderer/Actions/Theme toggle',
  component: ThemeToggle,
  parameters: { layout: 'centered' },
  args: { theme: 'light', onChange: () => undefined },
} satisfies Meta<typeof ThemeToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Light: Story = {
  render: () => <InteractiveThemeToggle initialTheme="light" />,
};

export const Dark: Story = {
  render: () => <InteractiveThemeToggle initialTheme="dark" />,
};
