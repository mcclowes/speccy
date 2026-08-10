import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  ApiPath,
  DisclosureChevron,
  MethodBadge,
  RequiredMark,
} from './DesignSystem';
import styles from './DesignSystem.stories.module.css';

const meta = {
  title: 'Design system/Primitives',
  parameters: { layout: 'centered' },
  render: () => (
    <div className={styles.stack}>
      <section>
        <h2>Method badges</h2>
        <div className={styles.row}>
          {['get', 'post', 'put', 'patch', 'delete'].map((method) => (
            <MethodBadge method={method} key={method} />
          ))}
          <MethodBadge method="post" webhook />
        </div>
      </section>
      <section>
        <h2>Compact method badges</h2>
        <div className={styles.row}>
          {['get', 'post', 'put', 'patch', 'delete'].map((method) => (
            <MethodBadge method={method} compact key={method} />
          ))}
          <MethodBadge method="post" compact webhook />
        </div>
      </section>
      <section>
        <h2>API path</h2>
        <ApiPath value="/customers/{customerId}/payments/{paymentId}" />
      </section>
      <section>
        <h2>Indicators</h2>
        <div className={styles.row}>
          <RequiredMark />
          <span aria-expanded="true">
            <DisclosureChevron />
          </span>
          <span aria-expanded="false">
            <DisclosureChevron />
          </span>
        </div>
      </section>
    </div>
  ),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;
export const AllPrimitives: Story = {};
