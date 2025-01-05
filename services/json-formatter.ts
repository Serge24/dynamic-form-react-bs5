export default interface JsonFormatter<T> {
    items: T[];
    [key: string]: any; // Allow additional properties
}