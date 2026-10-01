import { zodResolver } from '@hookform/resolvers/zod'
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { type DefaultValues, type FieldPath, type FieldValues, FormProvider, get, type Resolver, type SubmitHandler, useForm, useFormContext, useFormState } from 'react-hook-form'
import type { z } from 'zod'
import { markRender } from '../render-meter'

type Common<T extends FieldValues> = { name: FieldPath<T>; label: string }
type TextProps<T extends FieldValues> = Common<T> & Omit<InputHTMLAttributes<HTMLInputElement>, 'name'>
type SelectProps<T extends FieldValues> = Common<T> & Omit<SelectHTMLAttributes<HTMLSelectElement>, 'name'> & { options: { value: string; label: string }[] }
type TextareaProps<T extends FieldValues> = Common<T> & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'name'>

function Shell({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return <><label>{label}{children}</label><p className="error">{error ?? ''}</p></>
}

function useUncontrolledField<T extends FieldValues>(name: FieldPath<T>) {
  const { register, control } = useFormContext<T>()
  const { errors } = useFormState({ control, name, exact: true })
  return { registration: register(name), error: get(errors, name)?.message as string | undefined }
}

function Text<T extends FieldValues>({ name, label, ...props }: TextProps<T>) {
  if (import.meta.env.DEV) markRender(`Field.Text:${String(name)}`)
  const { registration, error } = useUncontrolledField<T>(name)
  return <Shell label={label} error={error}><input {...props} {...registration} /></Shell>
}

function Select<T extends FieldValues>({ name, label, options, ...props }: SelectProps<T>) {
  if (import.meta.env.DEV) markRender(`Field.Select:${String(name)}`)
  const { registration, error } = useUncontrolledField<T>(name)
  return <Shell label={label} error={error}><select {...props} {...registration}><option value="">Selecione</option>{options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Shell>
}

function Textarea<T extends FieldValues>({ name, label, ...props }: TextareaProps<T>) {
  if (import.meta.env.DEV) markRender(`Field.Textarea:${String(name)}`)
  const { registration, error } = useUncontrolledField<T>(name)
  return <Shell label={label} error={error}><textarea {...props} {...registration} /></Shell>
}

function Checkbox<T extends FieldValues>({ name, label }: Common<T>) {
  if (import.meta.env.DEV) markRender(`Field.Checkbox:${String(name)}`)
  const { registration, error } = useUncontrolledField<T>(name)
  return <><label className="check"><input {...registration} type="checkbox" /> {label}</label><p className="error">{error ?? ''}</p></>
}

const FieldImpl = { Text, Select, Textarea, Checkbox }

export function useCreateForm<S extends z.ZodType>(schema: S, defaultValues: z.input<S>) {
  type Values = z.input<S> & FieldValues
  type Output = z.output<S> & FieldValues
  const form = useForm<Values, unknown, Output>({
    defaultValues: defaultValues as DefaultValues<Values>,
    resolver: zodResolver(schema as never) as unknown as Resolver<Values, unknown, Output>,
  })
  const Form = ({ onSubmit, children }: { onSubmit: SubmitHandler<Output>; children: ReactNode }) => <FormProvider {...form}><form onSubmit={form.handleSubmit(onSubmit)} noValidate>{children}</form></FormProvider>
  return { form, Form, Field: FieldImpl as { Text: (p: TextProps<Values>) => ReactNode; Select: (p: SelectProps<Values>) => ReactNode; Textarea: (p: TextareaProps<Values>) => ReactNode; Checkbox: (p: Common<Values>) => ReactNode } }
}
