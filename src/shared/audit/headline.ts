/** The gate's and the report's one-line summary of how many things need fixing. */
export function headlineFor(findingsCount: number): string {
  return findingsCount === 0
    ? 'Your marketing is in good shape.'
    : `We found ${findingsCount} things likely costing you consultations.`;
}
