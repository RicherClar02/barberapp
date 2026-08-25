// Los 32 departamentos de Colombia con sus principales municipios
// Estructura: { departamento: [ciudades] }
const COLOMBIA = {
  'Amazonas': ['Leticia', 'Puerto Nariño'],
  'Antioquia': ['Medellín', 'Bello', 'Itagüí', 'Envigado', 'Apartadó', 'Rionegro', 'Turbo', 'Sabaneta', 'La Estrella', 'Copacabana', 'Caucasia', 'Caldas'],
  'Arauca': ['Arauca', 'Saravena', 'Tame', 'Arauquita', 'Fortul'],
  'Atlántico': ['Barranquilla', 'Soledad', 'Malambo', 'Sabanalarga', 'Puerto Colombia', 'Galapa', 'Baranoa'],
  'Bolívar': ['Cartagena', 'Magangué', 'Turbaco', 'Arjona', 'El Carmen de Bolívar', 'San Juan Nepomuceno'],
  'Boyacá': ['Tunja', 'Duitama', 'Sogamoso', 'Chiquinquirá', 'Paipa', 'Puerto Boyacá', 'Villa de Leyva'],
  'Caldas': ['Manizales', 'La Dorada', 'Chinchiná', 'Villamaría', 'Riosucio', 'Anserma'],
  'Caquetá': ['Florencia', 'San Vicente del Caguán', 'Puerto Rico', 'El Doncello', 'Belén de los Andaquíes'],
  'Casanare': ['Yopal', 'Aguazul', 'Villanueva', 'Tauramena', 'Paz de Ariporo', 'Monterrey'],
  'Cauca': ['Popayán', 'Santander de Quilichao', 'Puerto Tejada', 'Patía', 'Piendamó', 'Miranda'],
  'Cesar': ['Valledupar', 'Aguachica', 'Codazzi', 'Bosconia', 'La Jagua de Ibirico', 'Curumaní'],
  'Chocó': ['Quibdó', 'Istmina', 'Tadó', 'Condoto', 'Bahía Solano'],
  'Córdoba': ['Montería', 'Cereté', 'Lorica', 'Sahagún', 'Planeta Rica', 'Montelíbano', 'Tierralta'],
  'Cundinamarca': ['Bogotá', 'Soacha', 'Facatativá', 'Zipaquirá', 'Chía', 'Fusagasugá', 'Girardot', 'Mosquera', 'Madrid', 'Funza', 'Cajicá', 'La Calera'],
  'Guainía': ['Inírida', 'Barranco Minas'],
  'Guaviare': ['San José del Guaviare', 'El Retorno', 'Calamar', 'Miraflores'],
  'Huila': ['Neiva', 'Pitalito', 'Garzón', 'La Plata', 'Campoalegre', 'San Agustín'],
  'La Guajira': ['Riohacha', 'Maicao', 'Uribia', 'Fonseca', 'San Juan del Cesar', 'Villanueva'],
  'Magdalena': ['Santa Marta', 'Ciénaga', 'Fundación', 'El Banco', 'Plato', 'Zona Bananera'],
  'Meta': ['Villavicencio', 'Acacías', 'Granada', 'Puerto López', 'Cumaral', 'San Martín', 'Restrepo', 'Puerto Gaitán'],
  'Nariño': ['Pasto', 'Tumaco', 'Ipiales', 'Túquerres', 'La Unión', 'Samaniego'],
  'Norte de Santander': ['Cúcuta', 'Ocaña', 'Pamplona', 'Villa del Rosario', 'Los Patios', 'Tibú'],
  'Putumayo': ['Mocoa', 'Puerto Asís', 'Orito', 'Valle del Guamuez', 'Villagarzón', 'Sibundoy'],
  'Quindío': ['Armenia', 'Calarcá', 'La Tebaida', 'Montenegro', 'Quimbaya', 'Circasia', 'Salento'],
  'Risaralda': ['Pereira', 'Dosquebradas', 'Santa Rosa de Cabal', 'La Virginia', 'Belén de Umbría'],
  'San Andrés y Providencia': ['San Andrés', 'Providencia'],
  'Santander': ['Bucaramanga', 'Floridablanca', 'Girón', 'Piedecuesta', 'Barrancabermeja', 'San Gil', 'Socorro', 'Barbosa'],
  'Sucre': ['Sincelejo', 'Corozal', 'Sampués', 'San Marcos', 'Tolú', 'San Onofre'],
  'Tolima': ['Ibagué', 'Espinal', 'Melgar', 'Honda', 'Líbano', 'Chaparral', 'Mariquita'],
  'Valle del Cauca': ['Cali', 'Palmira', 'Buenaventura', 'Tuluá', 'Cartago', 'Buga', 'Jamundí', 'Yumbo', 'Candelaria', 'Florida'],
  'Vaupés': ['Mitú', 'Carurú'],
  'Vichada': ['Puerto Carreño', 'La Primavera', 'Cumaribo']
}

const DEPARTMENTS = Object.keys(COLOMBIA)

const getCitiesByDepartment = (department) => COLOMBIA[department] || null

module.exports = { COLOMBIA, DEPARTMENTS, getCitiesByDepartment }
