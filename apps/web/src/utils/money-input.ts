export function parseMoneyToCents(value: string | number): number | null {
  if (value === null || value === undefined || value === '') return null;
  
  const stringValue = String(value);
  
  // Remove currency symbols, spaces, R$, etc
  let cleanValue = stringValue.replace(/[^\d.,-]/g, '');
  
  // Replace comma with dot if there are no dots but a comma exists (Brazilian format like 125,90)
  if (!cleanValue.includes('.') && cleanValue.includes(',')) {
    cleanValue = cleanValue.replace(',', '.');
  } else if (cleanValue.includes('.') && cleanValue.includes(',')) {
    // If it has both, we need to determine which is the decimal separator.
    // E.g. 1.234,56 -> remove dots, replace comma with dot
    // E.g. 1,234.56 -> remove commas
    const lastCommaIndex = cleanValue.lastIndexOf(',');
    const lastDotIndex = cleanValue.lastIndexOf('.');
    
    if (lastCommaIndex > lastDotIndex) {
      cleanValue = cleanValue.replace(/\./g, '').replace(',', '.');
    } else {
      cleanValue = cleanValue.replace(/,/g, '');
    }
  }

  const floatValue = parseFloat(cleanValue);
  
  if (isNaN(floatValue) || floatValue <= 0) return null;
  
  // Multiply by 100 and round to avoid floating point issues like 125.90 * 100 = 12589.999999999998
  return Math.round(floatValue * 100);
}
