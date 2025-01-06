import React, { useEffect, useRef, useState } from "react";
import Select from "react-select";
import DateTime from "react-datetime";
import "react-datetime/css/react-datetime.css";
import { CrudClass, DateOption, FieldMetadata, SelectOption } from "../models/CrudClass";
import moment from 'moment';
import 'moment/locale/fr';
import { faSave } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

interface DynamicFormProps {
    model: typeof CrudClass, // The model class
    onSubmit: (formData: Record<string, any>) => void; // Callback when form is submitted
    url: string | {useAPI?:boolean, route:string, formatterKey?:string|number|symbol}
    headers?: Record<string, string>,
    onBeforeFetch: () => void,
    onAfterFetch: () => void
    onData?: (data: any) => void
    onError: (error: any) => void
}

const DynamicFormUpdate: React.FC<DynamicFormProps> = ({ url, onSubmit, onError, model, headers, onBeforeFetch, onAfterFetch, onData }: DynamicFormProps) => {
    
    //const fields = model.prototype.getFormalFields();
    const updateFields = useRef<FieldMetadata[]>(
        model.getFieldsForOperation("update")
    );

    const [formData, setFormData] = useState<Partial<InstanceType<typeof CrudClass>>>(() =>
        updateFields.current.reduce((acc, field) => {
            acc[field.fieldName] = field.field_options?.type === "checkbox" ? false : ""; // Initialize checkboxes to `false`
            return acc;
        }, {} as Record<string, any>)
    );

    const [dynamicOptions, setDynamicOptions] = useState<Record<string, SelectOption[]>>({});

    
    const groupedFields = updateFields.current.reduce((acc, field) => {
        const {group="default"} = field; // Default group if none specified
        if (!acc[group]) acc[group] = [];
        acc[group].push(field);
        return acc;
    }, {} as Record<string, FieldMetadata[]>);


    const isValidDate = (options: DateOption, currentDate: any) => {
        const minDate = options.date_min ? moment(options.date_min) : null;
        const maxDate = options.date_max ? moment(options.date_max) : null;

        if (minDate && currentDate.isBefore(minDate, "day")) {
            return false;
        }
        return !(maxDate && currentDate.isAfter(maxDate, "day"));
    };


    useEffect(() => {
        const fetchData = async () => {
            onBeforeFetch?.();
            try {
                const data = await model.fetchDataForUpdate({ url, headers, onBeforeFetch, onAfterFetch, onError });
                
                const formattedData = updateFields.current.reduce((acc, field) => {
                    const { fieldName, field_options:options } = field;
        
                    if (options?.type === "date" && data[fieldName]) {
                        const dateFormat = options.date_options?.format || "YYYY-MM-DD";
                        acc[fieldName] = moment(data[fieldName]).format(dateFormat);
                    } else if (options?.type === "select") {
                        acc[fieldName] = data[fieldName] || options.options;
                    } else {
                        acc[fieldName] = data[fieldName] || "";
                    }
        
                    return acc;
                }, {} as Record<string, any>);
                setFormData((prevData) => ({ ...prevData, ...formattedData }));

                onData?.(formData)
            } catch (fetchError) {
                onError?.("Error fetching update data:" + fetchError);
            } finally {
                onAfterFetch?.();
            }
        };
        
        fetchData();
        const fetchOptions = async () => {
            const fetchedOptions: Record<string, SelectOption[]> = {};

            try {
                await Promise.all(
                    updateFields.current.map(async (field) => {
                        const { fieldName, field_options:options } = field;
                        if (options?.type === "select") {
                            if (Array.isArray(options.options)) {
                                fetchedOptions[fieldName] = options.options;
                            } else if (typeof options.options === "string") {
                                try {
                                    const response = await fetch(options.options);
                                    if (!response.ok) throw new Error(`Failed to fetch ${options.options}`);
                                    const data = await response.json();
                                    fetchedOptions[fieldName] = data.map((item: any) => ({
                                        label: item.label || item.name || item.value,
                                        value: item.value || item.id,
                                    }));
                                } catch (error) {
                                    onError?.(`Failed to load options for ${fieldName}: ${error.message}`);
                                }
                            }
                        }
                    })
                );
                setDynamicOptions(fetchedOptions);
            } catch (fetchError) {
                onError("Failed to load options --- "+JSON.stringify(fetchError));
            }
        };

        if (updateFields.current.length > 0) { // Only fetch if there are fields to process
            fetchOptions();
        }
        return () => {
            //updateFields.current.splice(0)
        }
    }, [url, headers]);

    const handleChange = (fieldName: string, value: any) => {
        setFormData((prev) => {
            // Check if the new value is actually different to avoid redundant updates
            // if (prev[fieldName] === value) return prev;
            return {
                ...prev,
                [fieldName]: value,
            };
        });
    };
    

    const handleSelectChange = (fieldName: string, value: any | null) => {
        handleChange(fieldName, value ? value.value : "");
    };

    const handleDateChange = (fieldName: string, date: moment.Moment | string) => {
        if (moment(date).isValid()) {
            setFormData((prev) => ({
                ...prev,
                [fieldName]: moment(date).format("YYYY-MM-DD"), // Ensure consistent formatting
            }));
        } else {
            console.error("Invalid date format");
        }
    };

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        onSubmit(formData);
    };

    return (
        <form onSubmit={handleSubmit} autoComplete="off">
           
            {Object.entries(groupedFields).map(([group, fields], index) => {

                return (
                    (
                        <div key={`grouped-wrapps-${index}`} className="form-group-section mb-4">
                            {group !== "default" && <h4 className="mb-3" key={`group-fields-header-${index}`}>{group}</h4>} {/* Display group title if not default */}
                            <div className="row" key={`group-fields-wrapper-${index}`}>
                                {fields.map((field) => {
                                    const { fieldName, field_options } = field;
                                    const {
                                        size = 12,
                                        className,
                                        type = "text",
                                        placeholder = "",
                                        multiple,
                                        label,
                                        date_options = {}
                                    } = field_options || {};
        
                                    const commonProps = {
                                        id: fieldName,
                                        name: fieldName,
                                        className,
                                        placeholder,
                                    };
        
                                    if(field?.hidden){
                                        return (
                                            <input
                                                key={"hidden-"+fieldName}
                                                {...commonProps}
                                                type={"hidden"}
                                                value={formData[fieldName]}
                                                onChange={(e) => handleChange(fieldName, e.target.value)}
                                            />
                                        )
                                    }

                                    let fieldClassName = "";
                                    if(typeof size === "number"){
                                        fieldClassName = "col-lg-"+size
                                    }else{
                                        const classes = Object.entries(size).filter(e=>(!!e[0] && !!e[1]));

                                        fieldClassName = classes.map(([key, value]) =>`col-${key}-${value}`).join(" ");
                                    }
        
                                    return (
                                        <div key={`field-container-${fieldName}`} className={`${fieldClassName} mb-3`}>
                                            <label key={`label-${fieldName}`} htmlFor={fieldName} className="form-label">
                                                {label || fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}
                                            </label>
                                            {["text", "file", "number", "tel", "url", "password", "email", "number"].includes(type.toLowerCase()) ? (
                                                <input
                                                    {...commonProps}
                                                    type={type}
                                                    value={formData[fieldName]}
                                                    onChange={(e) => handleChange(fieldName, e.target.value)}
                                                />
                                            ) : type === "textarea" ? (
                                                <textarea
                                                    {...commonProps}
                                                    rows={4}
                                                    value={formData[fieldName]}
                                                    onChange={(e) => handleChange(fieldName, e.target.value)}
                                                ></textarea>
                                            ) : type === "select" ? (
                                                <Select
                                                    options={dynamicOptions[fieldName] || []}
                                                    value={dynamicOptions[fieldName]?.find((option) => option.value === formData[fieldName]) || null}
                                                    onChange={(selectedOption) => handleSelectChange(fieldName, selectedOption)}
                                                    placeholder={placeholder || "Select an option"}
                                                    isClearable={true}
                                                    classNamePrefix="react-select"
                                                    isMulti={!!multiple}
                                                />
                                            ) : type === "checkbox" ? (
                                                <div className="form-check">
                                                    <input
                                                        type={type}
                                                        {... commonProps}
                                                        checked={formData[fieldName]}
                                                        onChange={(e) => handleChange(fieldName, e.target.checked)}
                                                        className="form-check-input"
                                                    />
                                                    <label key={`${fieldName}`} htmlFor={fieldName} className="form-check-label">
                                                        {placeholder || fieldName}
                                                    </label>
                                                </div>
                                            ) : type === "date" ? (
                                                <>
                                                    <DateTime
                                                        {...commonProps}
                                                        dateFormat={date_options?.format || "YYYY-MM-DD"}
                                                        locale="en-us"
                                                        isValidDate={(curDate) => isValidDate(date_options, curDate)}
                                                        value={formData[fieldName] ? moment(formData[fieldName]).format(date_options?.format || "YYYY-MM-DD") : null}
                                                        onChange={(date) => {
                                                            return handleDateChange(fieldName, moment(date).format(date_options?.format || "YYYY-MM-DD"))
                                                        }}
                                                        timeFormat={false}
                                                        closeOnSelect={true}
                                                    />
                                                </>
                                            ) : null}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )
                )
            })}
            <button type="submit" className="btn btn-outline-success float-end">
                <FontAwesomeIcon icon={faSave} /> {" "}
                Valider
            </button>
        </form>
    );
};

export default DynamicFormUpdate;