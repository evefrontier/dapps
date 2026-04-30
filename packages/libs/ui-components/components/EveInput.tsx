import * as NumberField from "@base_ui/react/NumberField";
import { TextField } from "@mui/material";
import React, { ReactNode, useEffect, useState } from "react";

/**
 * Component for editing text fields with different input types.
 *
 * @param inputType - The type of input: "string", "multiline", or "numerical".
 * @param defaultValue - The default value for the text field.
 * @param fieldName - The name of the field being input.
 * @param onChange - Function called when the value changes.
 * @param placeholder - Optional placeholder text for the field.
 *
 * @returns JSX Element representing the text editing component.
 */
export default function EveInput({
  inputType,
  defaultValue,
  fieldName,
  onChange,
  placeholder,
  maxChars,
}: {
  inputType: "string" | "multiline" | "numerical";
  defaultValue: React.MutableRefObject<string | number> | ReactNode;
  fieldName: string;
  onChange: (value: string | number | null) => void;
  placeholder?: string;
  maxChars?: number;
}): React.JSX.Element {
  // Internal state to track character count
  const [currentChars, setCurrentChars] = useState<number>(0);

  // Internal state to track input value
  const [inputValue, setInputValue] = useState<string>("");

  // Initialize character count and input value based on defaultValue
  useEffect(() => {
    let initialValue = "";

    if (typeof defaultValue === "string") {
      initialValue = defaultValue;
    } else if (
      defaultValue &&
      typeof defaultValue === "object" &&
      "current" in defaultValue &&
      typeof defaultValue.current === "string"
    ) {
      initialValue = defaultValue.current;
    }

    setInputValue(initialValue);
    setCurrentChars(initialValue.length);
  }, [defaultValue]);

  const defaultIsString = () => {
    if (typeof defaultValue === "string") return defaultValue;
  };

  const fieldId = fieldName.replace(/\s/g, "");

  // Handle input changes with character limit validation
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;

    // Check if the input exceeds the maximum character limit
    if (maxChars && newValue.length > maxChars) {
      return;
    }

    // Update internal state
    setInputValue(newValue);
    setCurrentChars(newValue.length);

    // Notify parent component
    onChange(newValue);
  };

  return (
    <div className="TextField grid w-full gap-2 mb-4" id={`edit-${fieldId}`}>
      <div className="flex justify-between">
        <span className="text-xs font-disket uppercase text-neutral-90">
          {fieldName}
        </span>
        {maxChars && (
          <span className="text-xs font-disket uppercase text-neutral-50">
            {currentChars}/{maxChars}
          </span>
        )}
      </div>
      {inputType == "numerical" ? (
        <NumberField.Root
          id={`input-${fieldId}`}
          className={"Eve-Numerical-Input-input"}
          aria-label={`numerical-input-${fieldId}`}
          min={0}
          onValueChange={(val: string | number | null) => {
            setCurrentChars(typeof val === "string" ? val.length : 0);
            onChange(val);
          }}
        >
          <NumberField.Group>
            <NumberField.Decrement>&minus;</NumberField.Decrement>
            <NumberField.Input
              placeholder={defaultIsString() ?? placeholder ?? fieldName}
            />
            <NumberField.Increment>+</NumberField.Increment>
          </NumberField.Group>
        </NumberField.Root>
      ) : (
        <TextField
          multiline={inputType == "multiline"}
          minRows={inputType == "multiline" ? 3 : undefined}
          id={`input-${fieldId}`}
          placeholder={defaultIsString() ?? placeholder ?? fieldName}
          value={inputValue}
          className="flex-grow"
          onChange={handleInputChange}
          inputProps={{ maxLength: maxChars }}
          autoComplete="off"
          autoFocus
        />
      )}
    </div>
  );
}
