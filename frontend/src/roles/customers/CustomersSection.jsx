import { lazy, useCallback, useState } from 'react'
import { Route, Routes } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '../../supabase'
import { usePipelineData } from '../../hooks/usePipelineData'
import { useManagerPipelineData } from '../../hooks/useManagerPipelineData'
import { useAdminPipelineData } from '../../hooks/useAdminPipelineData'
import { useT } from '../../i18n/useT'
import { useUndoToast } from '../../hooks/useUndoToast'
import { getStatusMeta } from '../../ui'
import { CUSTOMER_QUERY_KEYS } from './customerUtils'
import CustomersList from './CustomersList'

const CustomerPage = lazy(() => import('./CustomerPage'))

// One wrapper per scope, so each role only ever runs its own query.
export function OwnCustomers(props) {
  return <CustomersSection scope="own" query={usePipelineData(props.userEmail)} {...props} />
}
export function TeamCustomers(props) {
  return <CustomersSection scope="team" query={useManagerPipelineData(props.userEmail)} {...props} />
}
export function AllCustomers(props) {
  return <CustomersSection scope="all" query={useAdminPipelineData()} {...props} />
}

/**
 * CustomersSection — the customer list and a customer's page, for every role.
 * List filters live here so they survive opening a customer and coming back.
 *
 *   scope  own (agent) | team (manager) | all (admin)
 */
function CustomersSection({ scope, query, userEmail, userRole, agentsList = [], confirm }) {
  const t = useT()
  const queryClient = useQueryClient()
  const { data: customers = [], isLoading, isError } = query

  const [filters, setFilters] = useState({ search: '', status: 'All', agent: 'All', page: 1 })

  const refresh = useCallback(
    () => CUSTOMER_QUERY_KEYS.forEach((queryKey) => queryClient.invalidateQueries({ queryKey })),
    [queryClient]
  )

  const showUndo = useUndoToast()

  const writeStatus = (id, status) =>
    supabase.from('customers').update({ status, last_updated_at: new Date().toISOString() }).eq('id', id)

  const changeStatus = async (id, status) => {
    const before = customers.find((c) => c.id === id)
    const { error } = await writeStatus(id, status)
    if (error) {
      toast.error(t('customers.statusFailed'))
      console.error('Status update error:', error)
      return
    }
    refresh()
    if (!before || before.status === status) return
    const label = t(`status.customer.${getStatusMeta('customer', status).canonical}`, null, status)
    showUndo(
      t('undo.customerStatus', { name: before.fullName, status: label }),
      async () => {
        const result = await writeStatus(id, before.status || 'New')
        refresh()
        return result
      },
      { id: 'customer-status' }
    )
  }

  const deleteCustomer = async (id) => {
    try {
      // Remove stored files first; the row delete cascades to notes and reminders.
      const { data: docs } = await supabase.from('customer_documents').select('storage_path').eq('customer_id', id)
      const paths = (docs || []).map((d) => d.storage_path).filter(Boolean)
      if (paths.length > 0) await supabase.storage.from('customer-documents').remove(paths)

      const { error } = await supabase.from('customers').delete().eq('id', id)
      if (error) throw error

      toast.success(t('customers.deleted'))
      refresh()
      return true
    } catch (error) {
      console.error('Error deleting customer:', error)
      toast.error(t('customers.deleteFailed'))
      return false
    }
  }

  const shared = { scope, customers, isLoading, userEmail, userRole, agentsList, refresh }

  return (
    <Routes>
      <Route
        index
        element={
          <CustomersList
            {...shared}
            isError={isError}
            filters={filters}
            setFilters={setFilters}
            onStatusChange={changeStatus}
          />
        }
      />
      <Route path=":customerId" element={<CustomerPage {...shared} onDelete={deleteCustomer} confirm={confirm} />} />
    </Routes>
  )
}
