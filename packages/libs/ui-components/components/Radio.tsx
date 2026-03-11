import React from "react";
import {
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
} from "@mui/material";
import { pink } from "@mui/material/colors";

interface EveRadioGroupProps {
  label?: string;
  options: {
    value: string;
    label: string;
    onClick?: () => void;
  }[];
}

const EveRadioGroup = React.memo(({ label, options }: EveRadioGroupProps) => {
  return (
    <FormControl>
      {label && (
        <FormLabel
          id="eve-radio-buttons-group-label"
          className="Eve-Radio-Group"
        >
          {label}
        </FormLabel>
      )}
      <RadioGroup
        aria-labelledby="eve-radio-buttons-group-label"
        className="Eve-Radio-Group"
        defaultValue={options[0].value}
        name="radio-buttons-group"
      >
        {options.map((option) => (
          <FormControlLabel
            key={option.value}
            value={option.value}
            control={
              <Radio
                disableRipple
                sx={{
                  color: "hsla(17, 100%, 50%, 0.5)",
                  "&.Mui-checked": {
                    color: "hsla(17, 100%, 50%, 1)",
                  },
                }}
              />
            }
            label={option.label}
            onClick={option.onClick}
          />
        ))}
      </RadioGroup>
    </FormControl>
  );
});

export default EveRadioGroup;
