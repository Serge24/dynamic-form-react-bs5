
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { Moment } from 'moment';
import 'reflect-metadata';
import api from '../services/api';
import JsonFormatter from '../services/json-formatter';

// CRUD operation types
type Operation = 'create' | 'read' | 'update' | 'delete';

type SelectOption = {
    label: string;
    value: string;
};

type FieldType = |'text'    | 'number'      | 'email'   | 'password' 
                 | 'jsx'    | 'textarea'    | 'select'  | 'checkbox' 
                 | 'radio'  | 'date';

export type DateOption = {
    date_min?: string | Moment | Date;
    date_max?: string | Moment | Date;
    format?: string;
};

class FieldOptions {
    id?: string;
    className?: string; // Additional classes for the field
    type?: FieldType; // Input type (e.g., text, password, email, etc.)
    label?: string;
    placeholder?: string;
    multiple?: boolean = false;
    size?: number | { lg?: number; sm?: number; xl?: number; [key: string]: number | undefined };
    options?: string | SelectOption[];
    date_options?: DateOption;
}

type RenderFunction<T = any> = (value: any, row?: T, columnName?: string) => React.ReactNode;

type FieldGroupObj = { name: string; editable: boolean };

interface FieldMetadata {
    fieldName: string; // The name of the field
    operations: Operation[]; // CRUD operations applicable to the field
    field_options?: FieldOptions; // Rendering options for the field
    group?: string; // Group name or object with metadata
    header?: string; // Optional table header name for 'read' operation
    render?: RenderFunction<any>; // Optional render function for conditional rendering
    hidden:boolean
}

//type renderOnDataItem<T = typeof CrudClass> = (data: Partial<T>)=>void;
//type renderOnDataList = (data: Array<any>)=>void;

interface FetchProps {
    url: string | {useAPI?:boolean, route:string}
    headers?: Record<string, string>;
    onBeforeFetch?: () => void;
    onAfterFetch?: () => void;
    onError?: (error: any) => void;
}

abstract class CrudClass {
    private static tableHeaders: { fieldName: string; header: string }[] = [];
    
    [key: string]: any;
    
    abstract getFields(): FieldMetadata[];

    private getAllFields(): FieldMetadata[] {
        // Get decorator-based fields
        const decoratorFields: FieldMetadata[] = Reflect.getMetadata("fields", this) || [];
        
        return [...this.getFields() ,...decoratorFields, ];
    }

    static getTableColumnsForOperation(operation: Operation): FieldMetadata[] {
        return this.prototype.getAllFields().filter(
            (field) => (field.operations || [] as Operation[]).includes(operation) && !!field.header // Includes only decorated fields with 'read' headers
        );
    }

    static getFieldsForOperation(operation: Operation): FieldMetadata[] {
        console.log({["all fields"]:this.prototype.getAllFields()})
        return this.prototype.getAllFields().filter((field) => {
            return !!field.fieldName && (field.operations || [] as Operation[]).includes(operation)
        });
    }

    static getTableHeaders(): { fieldName: string; header: string }[] {
        return this.tableHeaders;
    }

    /**
     * Fetches data from the given API URL and populates the fields for the "update" operation.
     * @param apiUrl - The URL to fetch data from.
     * @param headers - Optional headers for the request.
     * @param onBeforeFetch - Optional callback to execute before fetching.
     * @param onAfterFetch - Optional callback to execute after fetching.
     */
    static async fetchData<T extends typeof CrudClass, F = JsonFormatter<InstanceType<T>>>({ url, headers, onBeforeFetch, onAfterFetch, onError, formatterKey}: FetchProps & { formatterKey: keyof F }):  Promise<Array<Partial<InstanceType<T>>>> {
        try {
            onBeforeFetch?.();

            const {route, useAPI} = (typeof url === 'string')? {route:url, useAPI:true}: url;

            const config: AxiosRequestConfig = { headers: headers || {} };

            let response:AxiosResponse<F, any> = {} as any;

            if(useAPI) {
                response = await api.get<any, AxiosResponse<F, any>>(route, config);
            }else{
                response = await axios.get<any, AxiosResponse<F, any>>(route, config)
            }

            if (response.statusText.toUpperCase() !== 'OK') {
                throw new Error(response.statusText);
            }

            let dataArray:Partial<InstanceType<T>>[] = [] as any;

            if (formatterKey && response.data) {
                // Use the formatterKey if provided
                dataArray = getNestedValue(response.data, formatterKey.toString()) as Partial<InstanceType<T>>[];
                dataArray = (response.data as F)[formatterKey] as Partial<InstanceType<T>>[];
            } else {
                // Assume the data is already in the requested format
                dataArray = response.data as Partial<InstanceType<T>>[];
            }


            const updatedArray: Array<Partial<InstanceType<T>>> = [] as any;

            // Process each item in the fetched data array
            dataArray.forEach((item) => {
                const updatedFields: Partial<InstanceType<T>> = {} as any;

                //console.log("Processing item:", item);
                // Iterate over fields metadata to include 'update' fields
                this.getFieldsForOperation("read").forEach((field) => {
                    //console.log(`Checking field: ${field.fieldName}, value:`, item[field.fieldName]);

                    if (item[field.fieldName] !== undefined) {
                        (updatedFields as any)[field.fieldName] = item[field.fieldName];
                        console.log({["data set"]: field.fieldName, ["-value"]:item[field.fieldName]})
                    }
                });

                console.log({["updated fields"]: updatedFields})

                //console.log("Updated fields:", updatedFields);

                updatedArray.push(updatedFields);
            });

            if (!dataArray || !Array.isArray(dataArray)) {
                throw new Error(`Data not found or invalid for formatterKey: ${formatterKey.toString()}`);
            }

            onAfterFetch?.();

            return updatedArray;
        } catch (error) {
            onError?.(error);
            return [];
        }
    }

    static async fetchDataOldL<T extends typeof CrudClass, F = JsonFormatter<InstanceType<T>>>({
        url,
        headers,
        onBeforeFetch,
        onAfterFetch,
        onError,
        formatterKey,
    }: FetchProps & { formatterKey?: string }): Promise<Array<Partial<InstanceType<T>>>> {
        try {
            onBeforeFetch?.();
    
            const { route, useAPI } = typeof url === "string" ? { route: url, useAPI: true } : url;
    
            const config: AxiosRequestConfig = { headers: headers || {} };
    
            let response: AxiosResponse<F, any> = {} as any;
    
            if (useAPI) {
                response = await api.get<any, AxiosResponse<F, any>>(route, config);
            } else {
                response = await axios.get<any, AxiosResponse<F, any>>(route, config);
            }
    
            if (response.statusText.toUpperCase() !== "OK") {
                throw new Error(response.statusText);
            }
    
            let dataArray: Partial<InstanceType<T>>[];
    
            if (formatterKey && response.data) {
                dataArray = getNestedValue(response.data, formatterKey) as Partial<InstanceType<T>>[];
            } else {
                dataArray = response.data as Partial<InstanceType<T>>[];
            }
    
            if (!dataArray || !Array.isArray(dataArray)) {
                throw new Error(`Data not found or invalid for formatterKey: ${formatterKey}`);
            }
    
            const updatedArray: Array<Partial<InstanceType<T>>> = [];
    
            dataArray.forEach((item, index) => {
                const updatedFields: Partial<InstanceType<T>> = {};
    
                console.log(`Processing item #${index + 1}:`, item);
    
                this
                    .getFieldsForOperation("read")
                    .forEach((field) => {
                        console.log(`Checking field: ${field.fieldName}, Value: ${item[field.fieldName]}`);
                        if (item[field.fieldName] !== undefined) {
                            (updatedFields as any)[field.fieldName] = item[field.fieldName];
                        }
                    });
    
                console.log(`Updated fields for item #${index + 1}:`, updatedFields);
    
                updatedArray.push(updatedFields);
            });
    
            onAfterFetch?.();
    
            return updatedArray;
        } catch (error) {
            onError?.(error);
            return [];
        }
    }
    

    /**
     * Fetches data from the given API URL and populates the fields for the "update" operation.
     * @param apiUrl - The URL to fetch data from.
     * @param headers - Optional headers for the request.
     * @param onBeforeFetch - Optional callback to execute before fetching.
     * @param onAfterFetch - Optional callback to execute after fetching.
     */
    static async fetchDataForUpdate<T extends typeof CrudClass, F = JsonFormatter<InstanceType<T>>>({ url, headers, onBeforeFetch, onAfterFetch, onError, onData, formatterKey }: FetchProps & { formatterKey: keyof F }): Promise<Partial<InstanceType<T>>> {
        try {
            onBeforeFetch?.();
            const config: AxiosRequestConfig = { headers: headers || {} };

            const {route, useAPI} = (typeof url === 'string')? {route:url, useAPI:true}: url;


            let response:AxiosResponse<F, any> = {} as any;

            if(useAPI) {
                response = await api.get<any, AxiosResponse<F, any>>(route, config);
            }else{
                response = await axios.get<any, AxiosResponse<F, any>>(route, config)
            }

            if (response.statusText.toUpperCase() !== "OK") {
                throw new Error(`Failed to fetch data: ${response.statusText}`);
            }

            //const data: Partial<InstanceType<T>> = response.data.data;
            //const data = (response.data as F)[formatterKey] as Partial<InstanceType<T>>;

            let dataArray:Partial<InstanceType<T>>[] = [] as any;

            if (formatterKey && response.data) {
                // Use the formatterKey if provided
                dataArray = getNestedValue(response.data, formatterKey.toString()) as Partial<InstanceType<T>>[];
                dataArray = (response.data as F)[formatterKey] as Partial<InstanceType<T>>[];
            } else {
                // Assume the data is already in the requested format
                dataArray = response.data as Partial<InstanceType<T>>[];
            }

            onData?.(dataArray as any)

            const updatedFields: Partial<InstanceType<T>> = {};

            const columns = this.getFieldsForOperation('update');
            // Populate fields with fetched data
            columns.filter(e=>e!==undefined).forEach((field) => {
                if (dataArray[field.fieldName] !== undefined && field.fieldName != undefined) {
                    (updatedFields as any)[field.fieldName] = dataArray[field.fieldName];
                }
            });

            return updatedFields;
        } catch (error) {
            onError?.('Error fetching data for update:' + error);
        }
        finally {
            onAfterFetch?.();
        }
    }

    //static initializeDerivedFields();
}

function CrudField(metadata: Partial<FieldMetadata>): PropertyDecorator {
    return function (target: CrudClass, propertyKey: string | symbol): void {
        //const clsContructor = target.constructor as typeof CrudClass;

        // Ensure `propertyKey` is a string for compatibility with `addFieldMetadata`
        if (typeof propertyKey !== "string") {
            throw new Error("CrudField decorator must be applied to class fields.");
        }

        // Register field metadata statically in the CrudClass
        //clsContructor.addFieldMetadata(propertyKey, metadata.operations || [], metadata.field_options, metadata.group, metadata.header, metadata.render, metadata.hidden);

        // Store metadata dynamically using Reflect for runtime introspection
        const fields: FieldMetadata[] = Reflect.getMetadata("fields", target) || [];
        Reflect.defineMetadata("fields", [...fields, { fieldName: propertyKey, ...metadata }], target);
    };
}

function getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((o, key) => (o ? o[key] : undefined), obj);
}


export { CrudClass, CrudField, type Operation, type FieldOptions, type FieldType,
     type FieldMetadata, type SelectOption, type FieldGroupObj };