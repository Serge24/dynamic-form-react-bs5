import React, { MouseEventHandler, useCallback, useEffect, useRef, useState } from 'react';
import DataTable, { DataTableRef, DataTableSlot, DataTableSlots } from 'datatables.net-react';
import moment, { Moment } from 'moment';
import { CrudClass, FieldMetadata } from "../models/CrudClass";
import JsonFormatter from '../services/json-formatter';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTrash, faPencilAlt, faEye } from "@fortawesome/free-solid-svg-icons";

import 'bootstrap/dist/css/bootstrap.css';


import DT from 'datatables.net-dt';
 
DataTable.use(DT);

import $ from 'jquery';
window.$ = $;

type T = typeof CrudClass;

interface DynamicDataTableProps {
    url: string | {useAPI?:boolean, route:string, formatterKey?: string|number|symbol}
    headers?: Record<string, string>;
    model: T;
    onBeforeFetch: () => void;
    onAfterFetch: () => void;
    onData?: (data: Array<Partial<InstanceType<T>>>) => void;
    onError: (error: any) => void;
    actions?: {
        onEdit?: (model: Partial<InstanceType<T>>) => void;
        onView?: (model: Partial<InstanceType<T>>) => void;
        onDelete?: (model: Partial<InstanceType<T>>) => void
    };
}

const DynamicDataTable: React.FC<DynamicDataTableProps> = ({model, url, headers, actions={}, onBeforeFetch, onAfterFetch, onError, onData}) => {
    const tableRef = useRef<DataTableRef | null>(null);
    const [data, setData] = useState<Record<string, any>[]>([]);

    const onEditCallBack = useCallback(
        (e: React.MouseEvent, callback: (m: Partial<T>) => void, model: Partial<T>): void | undefined => {
            e.preventDefault();
            callback(model);
        },
        []
    );
    
    const onViewCallBack = useCallback(
        (e: React.MouseEvent, callback: (m: Partial<T>) => void, model: Partial<T>): void | undefined => {
            e.preventDefault();
            callback(model);
        },
        []
    );   

    const onDeleteCallBack = useCallback(
        (e: React.MouseEvent, callback: (m: Partial<T>) => void, model: Partial<T>): void | undefined => {
            e.preventDefault();
            callback(model);
        },
        []
    );
    

    useEffect(() => {
        const fetchData = async () => {
            try {
                onBeforeFetch?.();
                const fetchedData = await model.fetchData({ url, headers, onBeforeFetch, onAfterFetch, onError, formatterKey:"users" });
                setData(fetchedData);
                onData?.(fetchedData);
            } catch (err: any) {
                onError(err);
            } finally {
                onAfterFetch?.();
            }
        };

        fetchData();
    }, [url, actions, headers, model, onBeforeFetch, onAfterFetch, onError]);

    
    const isDateValid = (date: string | Moment | Date)=>{
        return moment(date).isValid()
    }
    
    const columns = model.getTableColumnsForOperation('read').map((field, index) => {
        const getRenderFunction = (field: FieldMetadata) => {
            if (!field || !field.field_options) {
                return undefined;
            }
    
            switch (field?.field_options?.type) {
                case 'date':
                    return (data: any) =>
                        data && moment(data).isValid()
                            ? moment(data).format('DD/MM/YYYY')
                            : 'Invalid Date';
                case 'jsx':
                    return (data: any) => {
                        return (
                            typeof data === 'string' ? (
                                <div dangerouslySetInnerHTML={{ __html: data }} />
                            ) : (
                                <div>{data}</div>
                            )
                        )
                    };
                default:
                    return undefined;
            }
        };    

        const customRender = getRenderFunction(field);

        return {
            key: `key-${index}`,
            title: field.header || field.fieldName, // Use `header` if defined; otherwise, fallback to `fieldName`
            data: (row: any) =>
                field?.render?.(row[field.fieldName], row, field.fieldName) ||
                row[field.fieldName] ||
                'N/A', // Default data value
            className: 'pt-2 pb-2',
            render: customRender || undefined, // Attach the custom render function, if available
        };
    });

    const renderTableActionSlot = (rowData: Partial<T>)=>{
        if(actions){
            return (
                <div className="action-buttons">
                    {actions.onView && (
                        <button type='button' className="btn btn-sm btn-outline-info" onClick={(e)=>onViewCallBack(e, actions.onView, rowData)}>
                            <FontAwesomeIcon icon={faEye} />
                        </button>
                    )}
                    {actions.onEdit && (
                        <button style={{margin:"8px"}} type='button' className="btn btn-sm btn-outline-success" onClick={(e)=>onEditCallBack(e, actions.onEdit, rowData)}>
                            <FontAwesomeIcon icon={faPencilAlt} />
                        </button>
                    )}
                    {actions.onDelete && (
                        <button type='button' className="btn btn-sm btn-outline-danger" onClick={(e)=>onDeleteCallBack(e, actions.onDelete, rowData)}>
                             <FontAwesomeIcon icon={faTrash} />
                        </button>
                    )}
                </div>
            )
        }
    }

    return (
        <>
            <DataTable 
                className={"table table-hover text-nowrap "+data.length} 
                data={data} 
                ref={tableRef} 
                columns={columns}
                slots={actions ?{
                    [Number(columns.length)]: (_:any, rowData:Partial<T>)=>renderTableActionSlot(rowData)
                }:undefined}>
                <thead>
                    <tr>
                        {columns.map((column) => (
                            <th className="border-top-0 py-4" key={column.key}>
                                {column.title}
                            </th>
                        ))}

                        {
                            actions && (
                                <th className="border-top-0 py-4">
                                    Actions
                                </th>
                            )
                        }
                    </tr>
                </thead>
            </DataTable>
        </>
    );
};

export default DynamicDataTable;
