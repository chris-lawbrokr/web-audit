/** 2140 → "2,140". */
export const formatNumber = (value: number) => value.toLocaleString('en-US');

/** "October 6, 2026". */
export const formatDate = (date: Date) =>
  date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
