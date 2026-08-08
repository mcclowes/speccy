/**
 * ---
 * purpose: Provides the web studio's realistic, interactive semantic OpenAPI diff showcase.
 * related:
 *   - ./diffExampleSpecs.ts - Supplies the two API versions compared here.
 *   - ./main.tsx - Selects this showcase for the /diff route.
 * ---
 */

import { useMemo } from 'react';
import { diffSpecs } from '@speccy/core';
import { SpecDiff } from 'speccy-renderer';
import { LIBRARY_V1, LIBRARY_V2 } from './diffExampleSpecs';

export function DiffExample() {
  const report = useMemo(() => diffSpecs(LIBRARY_V1, LIBRARY_V2), []);

  return (
    <SpecDiff
      className="diff-example"
      headingLevel={1}
      report={report}
      hrefForChange={(change) => change.operationId ? `/#${change.operationId}` : undefined}
    />
  );
}
