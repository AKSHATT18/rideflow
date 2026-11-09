import * as React from "react"
import { Input } from "./Input"
import { Label } from "./Label"

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
  ({ label, error, className, ...props }, ref) => {
    return (
      <div className="space-y-1.5 w-full">
        <Label htmlFor={props.id || props.name}>{label}</Label>
        <Input 
          ref={ref} 
          className={error ? "border-red-500 focus-visible:ring-red-500" : className}
          {...props} 
        />
        {error && (
          <p className="text-xs font-medium text-red-500 mt-1">{error}</p>
        )}
      </div>
    )
  }
)
FormInput.displayName = "FormInput"
