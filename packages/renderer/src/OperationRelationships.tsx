/**
 * ---
 * purpose: Presents prerequisite and response-linked operations as navigable workflow context.
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
import { MethodBadge } from './DesignSystem';
import styles from './OperationRelationships.module.css';

interface Relationship {
  key: string;
  label: string;
  context?: string;
  description?: string;
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
  if (segments.length !== 3 || segments[0] !== 'paths') return undefined;

  return operations.find(
    (operation) =>
      operation.source === 'path' &&
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
      (operation) => operation.operation.operationId === reference,
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
      {relationship.target && (
        <span className={styles.address}>
          <MethodBadge method={relationship.target.method} compact />
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
      description:
        typeof reference === 'string' ? undefined : reference.description,
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

  if (prerequisites.length === 0 && successors.length === 0) return null;

  return (
    <section className={styles.relationships} aria-labelledby="workflow-title">
      <h2 id="workflow-title">Workflow</h2>
      <div className={styles.groups}>
        {prerequisites.length > 0 && (
          <div className={styles.group}>
            <h3>Before this operation</h3>
            <div className={styles.cards}>
              {prerequisites.map((relationship) => (
                <RelationshipCard
                  relationship={relationship}
                  hrefForOperation={hrefForOperation}
                  onNavigate={onNavigate}
                  key={relationship.key}
                />
              ))}
            </div>
          </div>
        )}
        {successors.length > 0 && (
          <div className={styles.group}>
            <h3>Possible next operations</h3>
            <div className={styles.cards}>
              {successors.map((relationship) => (
                <RelationshipCard
                  relationship={relationship}
                  hrefForOperation={hrefForOperation}
                  onNavigate={onNavigate}
                  key={relationship.key}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
