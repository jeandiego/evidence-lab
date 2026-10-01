import { zodResolver } from '@hookform/resolvers/zod'
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { type DefaultValues, type FieldPath, type FieldValues, FormProvider, type Resolver, type SubmitHandler, useController, useForm, useFormContext } from 'react-hook-form'
import type { z } from 'zod'
import { markRender } from '../render-meter'

type Common<T extends FieldValues> = { name: FieldPath<T>; label: string }
type TextProps<T extends FieldValues> = Common<T> & Omit<InputHTMLAttributes<HTMLInputElement>, 'name'>
type SelectProps<T extends FieldValues> = Common<T> & Omit<SelectHTMLAttributes<HTMLSelectElement>, 'name'> & { options: { value: string; label: string }[] }
type TextareaProps<T extends FieldValues> = Common<T> & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'name'>

function Shell({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return <><label>{label}{children}</label><p className="error">{error ?? ''}</p></>
}

function useBoundField<T extends FieldValues>(name: FieldPath<T>) {
  const { control } = useFormContext<T>()
  return useController({ control, name })
}

function Text<T extends FieldValues>({ name, label, ...props }: TextProps<T>) {
  if (import.meta.env.DEV) markRender(`Field.Text:${String(name)}`)
  const { field, fieldState } = useBoundField<T>(name)
  return <Shell label={label} error={fieldState.error?.message}><input {...props} {...field} value={String(field.value ?? '')} /></Shell>
}

function Select<T extends FieldValues>({ name, label, options, ...props }: SelectProps<T>) {
  if (import.meta.env.DEV) markRender(`Field.Select:${String(name)}`)
  const { field, fieldState } = useBoundField<T>(name)
  return <Shell label={label} error={fieldState.error?.message}><select {...props} {...field} value={String(field.value ?? '')}><option value="">Selecione</option>{options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Shell>
}

function Textarea<T extends FieldValues>({ name, label, ...props }: TextareaProps<T>) {
  if (import.meta.env.DEV) markRender(`Field.Textarea:${String(name)}`)
  const { field, fieldState } = useBoundField<T>(name)
  return <Shell label={label} error={fieldState.error?.message}><textarea {...props} {...field} value={String(field.value ?? '')} /></Shell>
}

function Checkbox<T extends FieldValues>({ name, label }: Common<T>) {
  if (import.meta.env.DEV) markRender(`Field.Checkbox:${String(name)}`)
  const { field, fieldState } = useBoundField<T>(name)
  return <><label className="check"><input ref={field.ref} name={field.name} type="checkbox" checked={Boolean(field.value)} onBlur={field.onBlur} onChange={event => field.onChange(event.target.checked)} /> {label}</label><p className="error">{fieldState.error?.message ?? ''}</p></>
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
