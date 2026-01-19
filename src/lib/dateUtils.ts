export function formatDateForDisplay(dateString: string | Date | undefined): string {
    if (!dateString) return '';

    // If it's a string YYYY-MM-DD (typically from date picker or DB)
    if (typeof dateString === 'string') {
        // If it contains "T", it's likely ISO. 
        if (dateString.includes('T')) {
            const date = new Date(dateString);
            return date.toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
        }

        // It's YYYY-MM-DD
        const parts = dateString.split('-');
        if (parts.length === 3) {
            const year = parseInt(parts[0]);
            const month = parseInt(parts[1]) - 1; // Months are 0-indexed
            const day = parseInt(parts[2]);
            const date = new Date(year, month, day);
            return date.toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
        }
    }

    // Fallback for Date Objects
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
}
