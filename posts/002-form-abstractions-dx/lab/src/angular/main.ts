import angular from 'angular'
import template from './template.html?raw'

interface FormController {
  model: { name: string; email: string; role: string; bio: string; terms: boolean }
  result: FormController['model'] | null
  submit: (form: angular.IFormController) => void
}

angular.module('formLab', []).controller('FormController', function (this: FormController) {
  this.model = { name: '', email: '', role: '', bio: '', terms: false }
  this.result = null
  this.submit = (form: angular.IFormController) => {
    if (form.$invalid) {
      Object.values(form).forEach(control => {
        if (control && typeof control === 'object' && '$setTouched' in control) control.$setTouched()
      })
      return
    }
    this.result = { ...this.model, name: this.model.name.trim(), bio: this.model.bio.trim() }
  }
})

const root = document.getElementById('angular-root')!
root.innerHTML = template
angular.bootstrap(root, ['formLab'])
