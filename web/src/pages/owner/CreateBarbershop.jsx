import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Store, MapPin, Phone, Mail, AtSign, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../api/axios'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import useDocumentTitle from '../../hooks/useDocumentTitle'

// Solo estos tres son obligatorios: el modelo Barbershop los tiene como NOT NULL
// (name, address, city). El resto se completa después desde Configuración, y el
// medidor de completitud del dashboard va marcando lo que falta.
const REQUIRED = ['name', 'address', 'city']

const EMPTY = {
  name: '', description: '', department: '', city: '',
  address: '', phone: '', email: '', instagram: '',
}

export default function CreateBarbershop() {
  useDocumentTitle('Crear barbería')
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})

  const set = (field, value) => {
    setForm(f => ({ ...f, [field]: value }))
    setErrors(e => ({ ...e, [field]: undefined }))
  }

  const { data: deptData } = useQuery({
    queryKey: ['departments'],
    queryFn: () => api.get('/api/locations/departments').then(r => r.data),
    staleTime: Infinity,
  })
  const departments = deptData?.departments || []

  const { data: cityData } = useQuery({
    queryKey: ['cities', form.department],
    queryFn: () =>
      api.get(`/api/locations/cities/${encodeURIComponent(form.department)}`).then(r => r.data),
    enabled: !!form.department,
    staleTime: Infinity,
  })
  const cities = cityData?.cities || []

  // El validador del backend marca todos los campos como opcionales, así que un
  // nombre vacío llegaría hasta Prisma y volvería como error genérico. Validar
  // acá le da al dueño el mensaje puntual sobre el campo que falta.
  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'El nombre es obligatorio'
    if (!form.address.trim()) e.address = 'La dirección es obligatoria'
    if (!form.city) e.city = 'Elegí la ciudad'
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Email inválido'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const { mutate: create, isPending } = useMutation({
    mutationFn: () => {
      // No mandar strings vacíos: el validador usa optional({ values: 'falsy' }),
      // y así los opcionales quedan NULL en vez de ''.
      const payload = Object.fromEntries(
        Object.entries(form).filter(([, v]) => String(v).trim() !== '')
      )
      return api.post('/api/barbershops', payload).then(r => r.data)
    },
    onSuccess: () => {
      toast.success('Barbería creada')
      qc.invalidateQueries({ queryKey: ['my-barbershops'] })
      navigate('/owner/dashboard', { replace: true })
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || 'No se pudo crear la barbería'),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validate()) return
    create()
  }

  const missing = REQUIRED.filter(f => !form[f]?.trim()).length

  return (
    <div className="max-w-3xl space-y-6">
      {/* Encabezado */}
      <div className="flex items-start gap-4">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-primary rounded-xl shrink-0">
          <Store size={22} className="text-accent" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-primary font-heading">Crea tu barbería</h1>
          <p className="text-secondary text-sm mt-1">
            Es el primer paso: sin barbería no podés cargar servicios, barberos ni recibir citas.
            Después vas a poder completar el resto desde Configuración.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card title="Datos de la barbería">
          <div className="space-y-4">
            <Input
              label="Nombre *"
              placeholder="Barbería Estilo Centro"
              icon={<Store size={16} />}
              value={form.name}
              onChange={e => set('name', e.target.value)}
              error={errors.name}
              maxLength={100}
            />

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-secondary">Descripción</label>
              <textarea
                rows={3}
                maxLength={1000}
                placeholder="Contale a tus clientes qué hace distinta a tu barbería"
                value={form.description}
                onChange={e => set('description', e.target.value)}
                className="w-full rounded-lg border border-gray-soft px-3 py-2.5 text-sm text-black-soft bg-white placeholder-gray-400 outline-none transition-all focus:border-accent focus:ring-1 focus:ring-accent resize-none"
              />
              <p className="text-xs text-secondary">{form.description.length}/1000</p>
            </div>
          </div>
        </Card>

        <Card title="Ubicación">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-secondary">Departamento</label>
              <select
                value={form.department}
                onChange={e => {
                  set('department', e.target.value)
                  set('city', '')
                }}
                className="w-full rounded-lg border border-gray-soft px-3 py-2.5 text-sm text-black-soft bg-white outline-none transition-all focus:border-accent focus:ring-1 focus:ring-accent cursor-pointer"
              >
                <option value="">Elegí un departamento</option>
                {departments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-secondary">Ciudad *</label>
              <select
                value={form.city}
                onChange={e => set('city', e.target.value)}
                disabled={!form.department}
                className={`w-full rounded-lg border px-3 py-2.5 text-sm text-black-soft bg-white outline-none transition-all disabled:bg-cream disabled:cursor-not-allowed cursor-pointer
                  ${errors.city ? 'border-red-500 focus:ring-1 focus:ring-red-500' : 'border-gray-soft focus:border-accent focus:ring-1 focus:ring-accent'}`}
              >
                <option value="">
                  {form.department ? 'Elegí una ciudad' : 'Elegí primero el departamento'}
                </option>
                {cities.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {errors.city && <p className="text-xs text-red-500">{errors.city}</p>}
            </div>

            <Input
              label="Dirección *"
              placeholder="Calle 12 # 34-56, Barrio Centro"
              icon={<MapPin size={16} />}
              value={form.address}
              onChange={e => set('address', e.target.value)}
              error={errors.address}
              maxLength={200}
              className="md:col-span-2"
            />
          </div>
          <p className="text-xs text-secondary mt-3">
            La ubicación en el mapa la vas a poder ajustar más adelante desde Configuración.
          </p>
        </Card>

        <Card title="Contacto">
          <div className="grid md:grid-cols-2 gap-4">
            <Input
              label="Teléfono"
              placeholder="300 123 4567"
              icon={<Phone size={16} />}
              value={form.phone}
              onChange={e => set('phone', e.target.value)}
              maxLength={20}
            />
            <Input
              label="Correo de la barbería"
              type="email"
              placeholder="contacto@tubarberia.com"
              icon={<Mail size={16} />}
              value={form.email}
              onChange={e => set('email', e.target.value)}
              error={errors.email}
            />
            <Input
              label="Instagram"
              placeholder="@tubarberia"
              icon={<AtSign size={16} />}
              value={form.instagram}
              onChange={e => set('instagram', e.target.value)}
              className="md:col-span-2"
            />
          </div>
        </Card>

        <div className="flex items-center justify-between gap-4 flex-wrap">
          <p className="text-xs text-secondary flex items-center gap-1.5">
            <AlertCircle size={14} />
            {missing > 0
              ? `Faltan ${missing} campo(s) obligatorio(s) — marcados con *`
              : 'Listo para crear. Los demás datos podés cargarlos después.'}
          </p>
          <Button type="submit" size="lg" loading={isPending}>
            Crear barbería
          </Button>
        </div>
      </form>
    </div>
  )
}
