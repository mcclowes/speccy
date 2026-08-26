/**
 * ---
 * purpose: Presents prerequisites, response links, callbacks, and webhook relationships as compact workflow context.
 * related:
 *   - ./Speccy.tsx - Places workflow context on operation pages and owns navigation.
 *   - ../../core/src/types.ts - Defines the x-speccy-prerequisites extension shape.
 * ---
 */

import type { MouseEvent } from 'react';
import type {
  LinkObject,
  OperationModel,
  OperationReference,
} from 'speccy-core';
import { operationsInDeclarationOrder } from 'speccy-core';
import { DisclosureChevron, MethodBadge } from './DesignSystem';
import styles from './OperationRelationships.module.css';

interface Relationship {
  key: string;
  label: string;
  context?: string;
  description?: string;
  method?: OperationModel['method'];
  target?: OperationModel;
}

function operationLabel(operation: OperationModel): string {
  return (
    operation.operation.summary ??
    operation.operation.operationId ??
    operation.path
  );
}

function operationRefTarget(
  operationRef: string,
  operations: OperationModel[],
): OperationModel | undefined {
  const fragment = operationRef.split('#')[1];
  if (!fragment) return undefined;

  let decoded: string;
  try {
    decoded = decodeURIComponent(fragment);
  } catch {
    return undefined;
  }
  const segments = decoded
    .replace(/^\//, '')
    .split('/')
    .map((segment) => segment.replace(/~1/g, '/').replace(/~0/g, '~'));
  if (
    segments.length !== 3 ||
    (segments[0] !== 'paths' && segments[0] !== 'webhooks')
  )
    return undefined;

  return operations.find(
    (operation) =>
      operation.source === (segments[0] === 'paths' ? 'path' : 'webhook') &&
      operation.path === segments[1] &&
      operation.method === segments[2]?.toLowerCase(),
  );
}

function referenceTarget(
  reference: OperationReference | LinkObject,
  operations: OperationModel[],
): OperationModel | undefined {
  if (typeof reference === 'string') {
    return operations.find(
      (operation) =>
        operation.operation.operationId === reference ||
        (operation.source === 'webhook' && operation.path === reference),
    );
  }
  if (reference.operationId) {
    return operations.find(
      (operation) => operation.operation.operationId === reference.operationId,
    );
  }
  return reference.operationRef
    ? operationRefTarget(reference.operationRef, operations)
    : undefined;
}

function referenceLabel(reference: OperationReference | LinkObject): string {
  if (typeof reference === 'string') return reference;
  return reference.operationId ?? reference.operationRef ?? 'Unknown operation';
}

function referenceDescription(
  reference: OperationReference | LinkObject,
): string | undefined {
  return typeof reference === 'string' ? undefined : reference.description;
}

function RelationshipCard({
  relationship,
  hrefForOperation,
  onNavigate,
}: {
  relationship: Relationship;
  hrefForOperation: (operationId: string) => string;
  onNavigate: (operationId: string) => void;
}) {
  const content = (
    <>
      <span className={styles.cardTitle}>
        {relationship.target
          ? operationLabel(relationship.target)
          : relationship.label}
      </span>
      {(relationship.target || relationship.method) && (
        <span className={styles.address}>
          <MethodBadge
            method={relationship.target?.method ?? relationship.method!}
            compact
          />
        </span>
      )}
      {relationship.context && (
        <span className={styles.context}>{relationship.context}</span>
      )}
      {relationship.description && (
        <span className={styles.description}>{relationship.description}</span>
      )}
    </>
  );

  if (!relationship.target) return <div className={styles.card}>{content}</div>;

  return (
    <a
      className={styles.card}
      href={hrefForOperation(relationship.target.id)}
      onClick={(event: MouseEvent<HTMLAnchorElement>) => {
        event.preventDefault();
        onNavigate(relationship.target!.id);
      }}
    >
      {content}
    </a>
  );
}

export function OperationRelationships({
  item,
  operations,
  hrefForOperation,
  onNavigate,
}: {
  item: OperationModel;
  operations: OperationModel[];
  hrefForOperation: (operationId: string) => string;
  onNavigate: (operationId: string) => void;
}) {
  const prerequisites = (item.operation['x-speccy-prerequisites'] ?? []).map(
    (reference, index): Relationship => ({
      key: `prerequisite-${index}`,
      label: referenceLabel(reference),
      description: referenceDescription(reference),
      target: referenceTarget(reference, operations),
    }),
  );
  const successors = Object.entries(item.operation.responses ?? {}).flatMap(
    ([status, response]) =>
      Object.entries(response.links ?? {}).map(
        ([name, link]): Relationship => ({
          key: `successor-${status}-${name}`,
          label: referenceLabel(link),
          context: `After a ${status} response`,
          description: link.description,
          target: referenceTarget(link, operations),
        }),
      ),
  );
  const callbacks = Object.entries(item.operation.callbacks ?? {}).flatMap(
    ([name, callback]) =>
      Object.entries(callback).flatMap(([expression, pathItem]) => {
        if (expression === '$ref' || typeof pathItem === 'string') return [];

        return operationsInDeclarationOrder(pathItem).map(
          ([method, operation], index): Relationship => ({
            key: `callback-${name}-${expression}-${method}-${index}`,
            label: operation.summary ?? operation.operationId ?? name,
            context: `${name} · ${expression}`,
            description: operation.description,
            method,
          }),
        );
      }),
  );
  const emittedWebhooks = (item.operation['x-speccy-webhooks'] ?? []).map(
    (reference, index): Relationship => ({
      key: `emitted-webhook-${index}`,
      label: referenceLabel(reference),
      description: referenceDescription(reference),
      target: referenceTarget(reference, operations),
    }),
  );
  const webhookTriggers =
    item.source === 'webhook'
      ? operations
          .filter((operation) => operation.source === 'path')
          .flatMap((operation) =>
            (operation.operation['x-speccy-webhooks'] ?? [])
              .filter(
                (reference) =>
                  referenceTarget(reference, operations)?.id === item.id,
              )
              .map((reference, index): Relationship => ({
                key: `webhook-trigger-${operation.id}-${index}`,
                label: operationLabel(operation),
                description: referenceDescription(reference),
                target: operation,
              })),
          )
      : [];

  const groups = [
    { title: 'Before this operation', items: prerequisites },
    { title: 'Possible next operations', items: successors },
    { title: 'Callbacks from this operation', items: callbacks },
    { title: 'Events emitted', items: emittedWebhooks },
    { title: 'Triggered by operations', items: webhookTriggers },
  ].filter((group) => group.items.length > 0);

  if (groups.length === 0) return null;

  return (
    <details className={styles.relationships} aria-labelledby="workflow-title">
      <summary className={styles.summary}>
        <h2 id="workflow-title">Workflow</h2>
        <DisclosureChevron />
      </summary>
      <div className={styles.groups}>
        {groups.map((group) => (
          <div className={styles.group} key={group.title}>
            <h3>{group.title}</h3>
            <div className={styles.cards}>
              {group.items.map((relationship) => (
                <RelationshipCard
                  relationship={relationship}
                  hrefForOperation={hrefForOperation}
                  onNavigate={onNavigate}
                  key={relationship.key}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </details>
  );
}
