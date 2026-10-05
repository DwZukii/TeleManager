// Every user-facing string in the redesigned UI lives here, keyed once and
// translated per language. Stored values (lead statuses, roles) stay in English
// in the database; only their display labels are translated.
//
// The Bahasa Melayu column was written by a non-native speaker and should be
// read through by someone on the team before it reaches agents.

export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'ms', label: 'Bahasa Melayu' },
]

export const STRINGS = {
  en: {
    'common.cancel': 'Cancel',
    'common.confirm': 'Confirm',
    'common.close': 'Close',
    'common.save': 'Save',
    'common.delete': 'Delete',
    'common.search': 'Search',
    'common.loading': 'Loading',
    'common.previous': 'Previous',
    'common.next': 'Next',
    'common.noResults': 'Nothing to show',
    'common.noMatches': 'No matches',
    'common.required': 'required',
    'common.sortBy': 'Sort by {column}',
    'common.language': 'Language',

    'pagination.range': '{from}–{to} of {total}',
    'pagination.label': 'Pages',
    'pagination.page': 'Page {page} of {pages}',

    'table.actions': 'Actions',
    'table.loading': 'Loading rows',

    'combobox.placeholder': 'Choose…',
    'combobox.search': 'Type a name or email',
    'combobox.more': 'Showing {shown} of {total}. Keep typing to narrow it down.',
    'combobox.clear': 'Clear',

    'menu.more': 'More actions',

    'confirm.typeToConfirm': 'Type {word} to confirm',

    'status.lead.Pending': 'Pending',
    'status.lead.Called': 'Called',
    'status.lead.Called (No Answer)': 'No answer',
    'status.lead.WhatsApp Sent': 'WhatsApp sent',
    'status.lead.SMS Sent': 'SMS sent',
    'status.lead.Accepted': 'Accepted',
    'status.lead.Rejected': 'Rejected',
    'status.lead.Invalid Number': 'Invalid number',

    'status.customer.New': 'New',
    'status.customer.Process': 'Processing',
    'status.customer.Pending': 'Pending',
    'status.customer.Approved': 'Approved',
    'status.customer.Disbursed': 'Disbursed',
    'status.customer.Rejected': 'Rejected',

    'status.webLead.New': 'New',
    'status.webLead.Contacted': 'Contacted',
    'status.webLead.Qualified': 'Qualified',
    'status.webLead.Converted': 'Converted',
    'status.webLead.Junk': 'Junk',
  },

  ms: {
    'common.cancel': 'Batal',
    'common.confirm': 'Sahkan',
    'common.close': 'Tutup',
    'common.save': 'Simpan',
    'common.delete': 'Padam',
    'common.search': 'Cari',
    'common.loading': 'Memuatkan',
    'common.previous': 'Sebelum',
    'common.next': 'Seterusnya',
    'common.noResults': 'Tiada rekod',
    'common.noMatches': 'Tiada padanan',
    'common.required': 'wajib',
    'common.sortBy': 'Susun mengikut {column}',
    'common.language': 'Bahasa',

    'pagination.range': '{from}–{to} daripada {total}',
    'pagination.label': 'Halaman',
    'pagination.page': 'Halaman {page} daripada {pages}',

    'table.actions': 'Tindakan',
    'table.loading': 'Memuatkan baris',

    'combobox.placeholder': 'Pilih…',
    'combobox.search': 'Taip nama atau e-mel',
    'combobox.more': 'Menunjukkan {shown} daripada {total}. Teruskan menaip untuk mengecilkan carian.',
    'combobox.clear': 'Kosongkan',

    'menu.more': 'Tindakan lain',

    'confirm.typeToConfirm': 'Taip {word} untuk sahkan',

    'status.lead.Pending': 'Belum dihubungi',
    'status.lead.Called': 'Telah dihubungi',
    'status.lead.Called (No Answer)': 'Tidak dijawab',
    'status.lead.WhatsApp Sent': 'WhatsApp dihantar',
    'status.lead.SMS Sent': 'SMS dihantar',
    'status.lead.Accepted': 'Diterima',
    'status.lead.Rejected': 'Ditolak',
    'status.lead.Invalid Number': 'Nombor tidak sah',

    'status.customer.New': 'Baharu',
    'status.customer.Process': 'Dalam proses',
    'status.customer.Pending': 'Menunggu',
    'status.customer.Approved': 'Diluluskan',
    'status.customer.Disbursed': 'Dikeluarkan',
    'status.customer.Rejected': 'Ditolak',

    'status.webLead.New': 'Baharu',
    'status.webLead.Contacted': 'Dihubungi',
    'status.webLead.Qualified': 'Layak',
    'status.webLead.Converted': 'Berjaya',
    'status.webLead.Junk': 'Tidak berkaitan',
  },
}
