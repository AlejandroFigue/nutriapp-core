export interface ClinicalTest {
  id: string
  patientId: string
  date: string
  testName: string
}

export interface Hemograma extends ClinicalTest {
  globulosRojos: number
  hemoglobina: number
  hematocrito: number
  plaquetas: number
}

export interface PerfilLipidico extends ClinicalTest {
  colesterolTotal: number
  hdl: number
  ldl: number
  trigliceridos: number
}

export interface Glucemia extends ClinicalTest {
  valorGlucosa: number
  ayuno: number
}
