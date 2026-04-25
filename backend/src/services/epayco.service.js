// TODO: Activar con credenciales reales de ePayco
// TODO: Cambiar EPAYCO_TEST=false en producción
const Epayco = require('epayco-sdk-node')

const epayco = new Epayco({
  apiKey: process.env.EPAYCO_API_KEY,
  privateKey: process.env.EPAYCO_PRIVATE_KEY,
  lang: 'ES',
  test: process.env.EPAYCO_TEST !== 'false'
})

// Crear transacción para PSE, Nequi o Daviplata
const createTransaction = async ({ amount, description, appointmentId, clientEmail, clientName, method }) => {
  const data = {
    name: description,
    description,
    invoice: appointmentId,
    currency: 'cop',
    amount: String(amount),
    tax_base: '0',
    tax: '0',
    country: 'CO',
    lang: 'ES',
    extra1: appointmentId,
    ip: '127.0.0.1',
    email_billing: clientEmail,
    name_billing: clientName,
    type_doc_billing: 'cc',
    redirect_url: process.env.EPAYCO_REDIRECT_URL || 'http://localhost:3000/api/payments/epayco/confirm',
    response_url: process.env.EPAYCO_RESPONSE_URL || 'http://localhost:3000/api/payments/epayco/confirm'
  }

  let response
  if (method === 'PSE') {
    response = await epayco.bank.create(data)
  } else if (method === 'NEQUI') {
    data.phone = data.phone_billing
    response = await epayco.charge.create({ ...data, extra2: 'nequi' })
  } else if (method === 'DAVIPLATA') {
    response = await epayco.charge.create({ ...data, extra2: 'daviplata' })
  } else {
    throw new Error('Método ePayco no soportado. Use PSE, NEQUI o DAVIPLATA')
  }

  return response
}

// Consultar estado de una transacción por su ID
const verifyTransaction = async (transactionId) => {
  const response = await epayco.charge.get(transactionId)
  const status = response.data?.status || response.status
  const amount = response.data?.amount || response.amount
  const method = response.data?.paymentMethod || null
  return { status, amount, method, raw: response.data || response }
}

// Verificar firma de seguridad del webhook ePayco
const verifySignature = (params) => {
  const crypto = require('crypto')
  const { x_cust_id_cliente, x_ref_payco, x_transaction_id, x_amount, x_currency_code, x_signature } = params
  const signature = crypto
    .createHash('sha256')
    .update(`${process.env.EPAYCO_P_KEY}^${x_cust_id_cliente}^${x_ref_payco}^${x_transaction_id}^${x_amount}^${x_currency_code}`)
    .digest('hex')
  return signature === x_signature
}

module.exports = { createTransaction, verifyTransaction, verifySignature }
