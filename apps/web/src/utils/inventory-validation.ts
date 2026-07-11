interface WarehouseFormValues {
  code: string
  name: string
}

export type WarehouseFormErrors = Partial<Record<keyof WarehouseFormValues, string>>

export const validateWarehouseForm = ({ code, name }: WarehouseFormValues): WarehouseFormErrors => {
  const errors: WarehouseFormErrors = {}
  const normalizedCode = code.trim()
  const normalizedName = name.trim()

  if (normalizedCode.length < 2 || normalizedCode.length > 20) {
    errors.code = 'inventory.form.validation.codeLength'
  }

  if (normalizedName.length < 2) {
    errors.name = 'inventory.form.validation.nameMinLength'
  }

  return errors
}
