/**
 * Setup Kari demo org data.
 * Adds Kari departments and employees to org-departments.json and org-employees.json
 * without removing existing Loov data (to preserve backward compatibility).
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, '../data');

// ─── Kari Departments ───

const KARI_DEPARTMENTS = [
  { id: 'Kari - KR', department_name: 'Kari', parent_id: 'All Departments', store_id: null, is_group: 1, enabled: true },
  { id: 'Офис - KR', department_name: 'Офис', parent_id: 'Kari - KR', store_id: null, is_group: false, enabled: true },
  { id: 'ТЦ Мега (Москва) - KR', department_name: 'ТЦ Мега (Москва)', parent_id: 'Kari - KR', store_id: '2000000001', is_group: false, enabled: true },
  { id: 'ТЦ Галерея (СПб) - KR', department_name: 'ТЦ Галерея (СПб)', parent_id: 'Kari - KR', store_id: '2000000002', is_group: false, enabled: true },
  { id: 'ТЦ Европа (Калининград) - KR', department_name: 'ТЦ Европа (Калининград)', parent_id: 'Kari - KR', store_id: '2000000003', is_group: false, enabled: true },
  { id: 'ТЦ Мега (Казань) - KR', department_name: 'ТЦ Мега (Казань)', parent_id: 'Kari - KR', store_id: '2000000004', is_group: false, enabled: true },
  { id: 'ТЦ Якутия (Якутск) - KR', department_name: 'ТЦ Якутия (Якутск)', parent_id: 'Kari - KR', store_id: '2000000005', is_group: false, enabled: true },
  { id: 'ТЦ Ривьера (Москва) - KR', department_name: 'ТЦ Ривьера (Москва)', parent_id: 'Kari - KR', store_id: '2000000006', is_group: false, enabled: true },
];

// ─── Kari Employees ───
// Structure: Regional Director (HR-EMP-00015) → Store Directors (HR-EMP-00X01) → Sales staff

const STORES = [
  { storeId: '2000000001', deptId: 'ТЦ Мега (Москва) - KR', prefix: '001' },
  { storeId: '2000000002', deptId: 'ТЦ Галерея (СПб) - KR', prefix: '002' },
  { storeId: '2000000003', deptId: 'ТЦ Европа (Калининград) - KR', prefix: '003' },
  { storeId: '2000000004', deptId: 'ТЦ Мега (Казань) - KR', prefix: '004' },
  { storeId: '2000000005', deptId: 'ТЦ Якутия (Якутск) - KR', prefix: '005' },
  { storeId: '2000000006', deptId: 'ТЦ Ривьера (Москва) - KR', prefix: '006' },
];

// Store directors
const STORE_DIRECTORS = [
  { id: 'HR-EMP-00101', name: 'Елена Сергеевна Новикова', first: 'Елена', store: 0 },
  { id: 'HR-EMP-00201', name: 'Ольга Николаевна Белова', first: 'Ольга', store: 1 },
  { id: 'HR-EMP-00301', name: 'Наталья Ивановна Миронова', first: 'Наталья', store: 2 },
  { id: 'HR-EMP-00401', name: 'Светлана Петровна Архипова', first: 'Светлана', store: 3 },
  { id: 'HR-EMP-00501', name: 'Ирина Владимировна Жукова', first: 'Ирина', store: 4 },
  { id: 'HR-EMP-00601', name: 'Татьяна Александровна Крылова', first: 'Татьяна', store: 5 },
];

// Sales staff per store (senior seller, 2-3 sellers, 1 cashier)
const STORE_STAFF = {
  '001': [
    { suffix: '02', name: 'Анна Владимировна Петрова', first: 'Анна', desig: 'Старший продавец' },
    { suffix: '03', name: 'Дмитрий Олегович Волков', first: 'Дмитрий', desig: 'Продавец-консультант' },
    { suffix: '04', name: 'Мария Андреевна Козлова', first: 'Мария', desig: 'Продавец-консультант' },
    { suffix: '05', name: 'Иван Петрович Сидоров', first: 'Иван', desig: 'Продавец-консультант' },
    { suffix: '06', name: 'Ксения Дмитриевна Романова', first: 'Ксения', desig: 'Кассир' },
  ],
  '002': [
    { suffix: '02', name: 'Андрей Викторович Кузнецов', first: 'Андрей', desig: 'Старший продавец' },
    { suffix: '03', name: 'Татьяна Сергеевна Лебедева', first: 'Татьяна', desig: 'Продавец-консультант' },
    { suffix: '04', name: 'Сергей Николаевич Павлов', first: 'Сергей', desig: 'Продавец-консультант' },
    { suffix: '05', name: 'Екатерина Дмитриевна Морозова', first: 'Екатерина', desig: 'Продавец-консультант' },
    { suffix: '06', name: 'Алексей Романович Соколов', first: 'Алексей', desig: 'Кассир' },
  ],
  '003': [
    { suffix: '02', name: 'Виктор Андреевич Орлов', first: 'Виктор', desig: 'Старший продавец' },
    { suffix: '03', name: 'Марина Павловна Волкова', first: 'Марина', desig: 'Продавец-консультант' },
    { suffix: '04', name: 'Павел Игоревич Григорьев', first: 'Павел', desig: 'Продавец-консультант' },
    { suffix: '05', name: 'Юлия Александровна Фёдорова', first: 'Юлия', desig: 'Кассир' },
  ],
  '004': [
    { suffix: '02', name: 'Владимир Сергеевич Степанов', first: 'Владимир', desig: 'Старший продавец' },
    { suffix: '03', name: 'Анастасия Ильинична Никитина', first: 'Анастасия', desig: 'Продавец-консультант' },
    { suffix: '04', name: 'Артём Валерьевич Егоров', first: 'Артём', desig: 'Продавец-консультант' },
    { suffix: '05', name: 'Дарья Константиновна Макарова', first: 'Дарья', desig: 'Кассир' },
  ],
  '005': [
    { suffix: '02', name: 'Михаил Олегович Попов', first: 'Михаил', desig: 'Старший продавец' },
    { suffix: '03', name: 'Ирина Валентиновна Макарова', first: 'Ирина', desig: 'Продавец-консультант' },
    { suffix: '04', name: 'Николай Михайлович Васильев', first: 'Николай', desig: 'Продавец-консультант' },
    { suffix: '05', name: 'Валерия Тимофеевна Тимофеева', first: 'Валерия', desig: 'Кассир' },
  ],
  '006': [
    { suffix: '02', name: 'Полина Романовна Ильина', first: 'Полина', desig: 'Старший продавец' },
    { suffix: '03', name: 'Денис Игоревич Захаров', first: 'Денис', desig: 'Продавец-консультант' },
    { suffix: '04', name: 'Алина Олеговна Кузьмина', first: 'Алина', desig: 'Продавец-консультант' },
    { suffix: '05', name: 'Роман Дмитриевич Беляев', first: 'Роман', desig: 'Продавец-консультант' },
    { suffix: '06', name: 'Виктория Ивановна Соловьёва', first: 'Виктория', desig: 'Кассир' },
  ],
};

function makeEmployee({ id, name, first, designation, department, departmentId, reportsTo, itigrisId, shiftFormat }) {
  return {
    id,
    employee_name: name,
    first_name: first,
    designation,
    department,
    department_id: departmentId,
    reports_to: reportsTo,
    tg_username: null,
    tg_chat_id: null,
    itigris_user_id: itigrisId,
    custom_itigris_user_id: itigrisId,
    company_email: null,
    image_url: null,
    frappe_user: null,
    date_of_birth: '1990-01-01',
    date_of_joining: '2025-01-15',
    gender: null,
    shift_format: shiftFormat,
    status: 'Active',
    enabled: true,
    frappe_id: id,
    name: id,
  };
}

// Build all Kari employees
const kariEmployees = [];

// Regional Director
kariEmployees.push(makeEmployee({
  id: 'HR-EMP-00015',
  name: 'Дмитрий Олегович Федулов',
  first: 'Дмитрий',
  designation: 'Региональный директор',
  department: 'Офис - KR',
  departmentId: 'Офис - KR',
  reportsTo: null,
  itigrisId: '2000000015',
  shiftFormat: '5/2',
}));

// Store Directors
for (const dir of STORE_DIRECTORS) {
  const store = STORES[dir.store];
  kariEmployees.push(makeEmployee({
    id: dir.id,
    name: dir.name,
    first: dir.first,
    designation: 'Директор магазина',
    department: store.deptId,
    departmentId: store.deptId,
    reportsTo: 'HR-EMP-00015',
    itigrisId: dir.id.replace('HR-EMP-00', '200000'),
    shiftFormat: '5/2',
  }));
}

// Store Staff
for (const store of STORES) {
  const staff = STORE_STAFF[store.prefix] || [];
  const directorId = `HR-EMP-00${store.prefix.slice(1)}01`;
  for (const person of staff) {
    const empId = `HR-EMP-00${store.prefix.slice(1)}${person.suffix}`;
    kariEmployees.push(makeEmployee({
      id: empId,
      name: person.name,
      first: person.first,
      designation: person.desig,
      department: store.deptId,
      departmentId: store.deptId,
      reportsTo: directorId,
      itigrisId: empId.replace('HR-EMP-00', '200000'),
      shiftFormat: person.desig === 'Кассир' ? '5/2' : '2/2',
    }));
  }
}

console.log(`Generated ${kariEmployees.length} Kari employees`);

// ─── Update org-employees.json ───
const empPath = resolve(DATA_DIR, 'org-employees.json');
const empData = JSON.parse(readFileSync(empPath, 'utf-8'));
const existingEmployees = empData.employees || [];

// Remove any existing Kari employees (IDs starting with HR-EMP-001xx through HR-EMP-006xx, and HR-EMP-00015 update)
const kariIds = new Set(kariEmployees.map(e => e.id));
const filteredExisting = existingEmployees.filter(e => !kariIds.has(e.id));

// Also update HR-EMP-00015 - remove old version
const finalEmployees = filteredExisting.filter(e => e.id !== 'HR-EMP-00015');

// Add Kari employees
finalEmployees.push(...kariEmployees);

empData.employees = finalEmployees;
writeFileSync(empPath, JSON.stringify(empData, null, 2) + '\n');
console.log(`Updated ${empPath}: ${finalEmployees.length} total employees (${filteredExisting.length} existing + ${kariEmployees.length} Kari)`);

// ─── Update org-departments.json ───
const deptPath = resolve(DATA_DIR, 'org-departments.json');
const deptData = JSON.parse(readFileSync(deptPath, 'utf-8'));
const existingDepts = deptData.departments || [];

// Remove existing Kari departments
const kariDeptIds = new Set(KARI_DEPARTMENTS.map(d => d.id));
const filteredDepts = existingDepts.filter(d => !kariDeptIds.has(d.id));

// Add Kari departments
filteredDepts.push(...KARI_DEPARTMENTS);

deptData.departments = filteredDepts;
writeFileSync(deptPath, JSON.stringify(deptData, null, 2) + '\n');
console.log(`Updated ${deptPath}: ${filteredDepts.length} total departments`);

console.log('\nDone! Restart the server for changes to take effect.');
