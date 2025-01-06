import React, { useEffect, useRef, useState } from "react";
import Select from "react-select";
import DateTime from "react-datetime";
import "react-datetime/css/react-datetime.css"; // Import datetime picker styles
import { CrudClass, DateOption, FieldMetadata, SelectOption } from "../models/CrudClass";
import moment from 'moment';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSave } from "@fortawesome/free-solid-svg-icons";

import "bootstrap";
import 'moment/locale/fr';
import 'bootstrap/dist/css/bootstrap.css';


interface DynamicFormProps {
  model: typeof CrudClass, // The model class
  onSubmit: (formData: Record<string, any>) => void; // Callback when form is submitted
}

const DynamicFormCreate: React.FC<DynamicFormProps> = ({ model, onSubmit }: DynamicFormProps) => {
  const createFields = useRef<FieldMetadata[]>(model.getFieldsForOperation("create"))

  const [formData, setFormData] = useState<Record<string, any>>(() =>
    createFields.current.reduce((acc, field) => {
      acc[field.fieldName] = field.field_options?.type === "checkbox" ? false : ""; // Initialize checkboxes to `false`
      return acc;
    }, {} as Record<string, any>)
  );

  const [dynamicOptions, setDynamicOptions] = useState<Record<string, SelectOption[]>>({});

  function isSelectOption(value: any): value is SelectOption {
    return (
      value &&
      typeof value === "object" &&
      typeof value.label === "string" &&
      typeof value.value === "string"
    );
  }

  function isSelectOptionArray(value: any): value is SelectOption[] {
    return Array.isArray(value) && value.every(isSelectOption);
  }

  const groupedFields = createFields.current.reduce((acc, field) => {
    const { group = "default" } = field
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
    if (maxDate && currentDate.isAfter(maxDate, "day")) {
      return false;
    }
    return true;
  };


  useEffect(() => {
    const fetchOptions = async () => {
      const fetchedOptions: Record<string, SelectOption[]> = {};

      try {
        await Promise.all(
          createFields.current.map(async (field) => {
            const { fieldName, field_options: options } = field;
            if (options?.type === "select" && typeof options.options === "string") {
              const response = await fetch(options.options);
              if (!response.ok) throw new Error(`Failed to fetch ${options.options}`);
              const data = await response.json();
              fetchedOptions[fieldName] = data.map((item: any) => ({
                label: item.label || item.name || item.value,
                value: item.value || item.id,
              }));
            } else if (isSelectOptionArray(options?.options)) {
              fetchedOptions[fieldName] = options?.options;
            }
          })
        );
        setDynamicOptions(fetchedOptions);
      } catch (fetchError) {
        console.error("Error fetching options:", fetchError);
      }
    };

    if (createFields.current.length > 0) { // Only fetch if there are fields to process
      fetchOptions();
    } 

    return () => {
      //createFields.current.splice(0)
    }
  }, [createFields]);

  const handleChange = (fieldName: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const handleSelectChange = (fieldName: string, value: any | null) => {
    handleChange(fieldName, value ? value.value : "");
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} autoComplete="off">
      {Object.entries(groupedFields).map(([group, fields]) => (
        <div key={group} className="form-group-section mb-4">
          {group !== "default" && <h4 className="mb-3">{group}</h4>} {/* Display group title if not default */}
          <div className="row">
            {fields.map((field) => {
              const { fieldName, field_options: options } = field;
              const {
                size = 12,
                className,
                type = "text",
                placeholder = "",
                multiple,
                label,
                date_options = {}
              } = options || {};

              const commonProps = {
                id: fieldName,
                name: fieldName,
                className,
                placeholder,
              };

              let fieldClassName: string = "";
              if (["number", "string"].includes(typeof size)) {
                fieldClassName = "col-lg-" + size
              } else {
                fieldClassName = Object.entries(size)
                  .filter(e => !!e[0] && !!e[1]).map(([key, value]) => {
                    return `col-${key}-${value}`
                  }).join(" ");
              }

              return (
                <div key={fieldName} className={`${fieldClassName} mb-3`}>
                  <label htmlFor={fieldName} className="form-label">
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
                      onChange={(selectedOption) =>
                        handleSelectChange(fieldName, selectedOption)
                      }
                      placeholder={placeholder || "Select an option"}
                      isClearable={true}
                      classNamePrefix="react-select"
                      isMulti={!!multiple}
                    />
                  ) : type === "checkbox" ? (
                    <div className="form-check">
                      <input
                        type="checkbox"
                        id={fieldName}
                        name={fieldName}
                        checked={formData[fieldName]}
                        onChange={(e) => handleChange(fieldName, e.target.checked)}
                        className="form-check-input"
                      />
                      <label htmlFor={fieldName} className="form-check-label">
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
                        value={formData[fieldName]}
                        onChange={(date) => handleChange(fieldName, moment(date).format(date_options?.format || "YYYY-MM-DD"))}
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
      ))}
      <button type="submit" className="btn btn-outline-success float-end">
        <FontAwesomeIcon icon={faSave} /> {" "}
        Enregistrer
      </button>
    </form>
  );
};

export default DynamicFormCreate;