export function formatDateTime(value?: string | null, locale: string = 'pt-BR'): string {
  if (!value) {
    return '-'
  }

  try {
    const date = new Date(value)
    
    // Check if valid date
    if (isNaN(date.getTime())) {
      return '-'
    }

    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  } catch (e) {
    return '-'
  }
}
