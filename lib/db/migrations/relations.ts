import { relations } from "drizzle-orm/relations";
import { accession_samples, sample_accession_audit_log, users, sample_status_history, patients, appointments, workspaces, laboratory_types, lims_orders, lims_order_tests, lab_test_catalog, labs, audit_logs, equipment, suppliers, materials, operations, pharmacies, drugs, drug_batches, study_protocols, patient_insurance, pharmacy_invoices, pharmacy_invoice_lines, pharmacy_orders, staff, pharmacy_stock_levels, pharmacy_stock_locations, todos, pharmacy_order_items, usersessions, pharmacy_stock_movements, pharmacy_substitutions, qc_runs, shop_orders, test_results, worklists, result_validation_history, samples, sample_storage, storage_locations, shop_order_items, validation_states, worklist_items, invoices, invoice_items, budget_periods, budget_categories, leave_types, leave_requests, leave_balance, shifts, shift_assignments, daily_attendance, employees, employee_schedules, daily_schedule_details, schedule_exceptions, employee_rotation_assignments, shift_rotations, leave_policy_rules, leave_audit_log, leave_approval_workflow, leave_request_approvals, workspaceusers } from "./schema";

export const sample_accession_audit_logRelations = relations(sample_accession_audit_log, ({one}) => ({
	accession_sample: one(accession_samples, {
		fields: [sample_accession_audit_log.sampleid],
		references: [accession_samples.sampleid]
	}),
	user: one(users, {
		fields: [sample_accession_audit_log.userid],
		references: [users.userid]
	}),
}));

export const accession_samplesRelations = relations(accession_samples, ({one, many}) => ({
	sample_accession_audit_logs: many(sample_accession_audit_log),
	sample_status_histories: many(sample_status_history),
	audit_logs: many(audit_logs),
	test_results_sampleid: many(test_results, {
		relationName: "test_results_sampleid_accession_samples_sampleid"
	}),
	test_results_accessionsampleid: many(test_results, {
		relationName: "test_results_accessionsampleid_accession_samples_sampleid"
	}),
	sample_storages: many(sample_storage),
	lims_order: one(lims_orders, {
		fields: [accession_samples.orderid],
		references: [lims_orders.orderid]
	}),
	user_accessionedby: one(users, {
		fields: [accession_samples.accessionedby],
		references: [users.userid],
		relationName: "accession_samples_accessionedby_users_userid"
	}),
	user_correctedby: one(users, {
		fields: [accession_samples.correctedby],
		references: [users.userid],
		relationName: "accession_samples_correctedby_users_userid"
	}),
	validation_states: many(validation_states),
}));

export const usersRelations = relations(users, ({many}) => ({
	sample_accession_audit_logs: many(sample_accession_audit_log),
	sample_status_histories: many(sample_status_history),
	laboratory_types_createdby: many(laboratory_types, {
		relationName: "laboratory_types_createdby_users_userid"
	}),
	laboratory_types_updatedby: many(laboratory_types, {
		relationName: "laboratory_types_updatedby_users_userid"
	}),
	lims_order_tests: many(lims_order_tests),
	audit_logs: many(audit_logs),
	equipment_createdby: many(equipment, {
		relationName: "equipment_createdby_users_userid"
	}),
	equipment_updatedby: many(equipment, {
		relationName: "equipment_updatedby_users_userid"
	}),
	materials_createdby: many(materials, {
		relationName: "materials_createdby_users_userid"
	}),
	materials_updatedby: many(materials, {
		relationName: "materials_updatedby_users_userid"
	}),
	operations: many(operations),
	lims_orders_orderingproviderid: many(lims_orders, {
		relationName: "lims_orders_orderingproviderid_users_userid"
	}),
	lims_orders_cancelledby: many(lims_orders, {
		relationName: "lims_orders_cancelledby_users_userid"
	}),
	study_protocols: many(study_protocols),
	usersessions: many(usersessions),
	qc_runs: many(qc_runs),
	shop_orders_orderedby: many(shop_orders, {
		relationName: "shop_orders_orderedby_users_userid"
	}),
	shop_orders_approvedby: many(shop_orders, {
		relationName: "shop_orders_approvedby_users_userid"
	}),
	shop_orders_createdby: many(shop_orders, {
		relationName: "shop_orders_createdby_users_userid"
	}),
	shop_orders_updatedby: many(shop_orders, {
		relationName: "shop_orders_updatedby_users_userid"
	}),
	test_results_enteredby: many(test_results, {
		relationName: "test_results_enteredby_users_userid"
	}),
	test_results_technicalvalidatedby: many(test_results, {
		relationName: "test_results_technicalvalidatedby_users_userid"
	}),
	test_results_medicalvalidatedby: many(test_results, {
		relationName: "test_results_medicalvalidatedby_users_userid"
	}),
	test_results_releasedby: many(test_results, {
		relationName: "test_results_releasedby_users_userid"
	}),
	test_results_createdby: many(test_results, {
		relationName: "test_results_createdby_users_userid"
	}),
	test_results_updatedby: many(test_results, {
		relationName: "test_results_updatedby_users_userid"
	}),
	result_validation_histories: many(result_validation_history),
	sample_storages_retrievedby: many(sample_storage, {
		relationName: "sample_storage_retrievedby_users_userid"
	}),
	sample_storages_disposedby: many(sample_storage, {
		relationName: "sample_storage_disposedby_users_userid"
	}),
	sample_storages_storedby: many(sample_storage, {
		relationName: "sample_storage_storedby_users_userid"
	}),
	suppliers_createdby: many(suppliers, {
		relationName: "suppliers_createdby_users_userid"
	}),
	suppliers_updatedby: many(suppliers, {
		relationName: "suppliers_updatedby_users_userid"
	}),
	storage_locations_createdby: many(storage_locations, {
		relationName: "storage_locations_createdby_users_userid"
	}),
	storage_locations_updatedby: many(storage_locations, {
		relationName: "storage_locations_updatedby_users_userid"
	}),
	accession_samples_accessionedby: many(accession_samples, {
		relationName: "accession_samples_accessionedby_users_userid"
	}),
	accession_samples_correctedby: many(accession_samples, {
		relationName: "accession_samples_correctedby_users_userid"
	}),
	validation_states_validatedby: many(validation_states, {
		relationName: "validation_states_validatedby_users_userid"
	}),
	validation_states_releasedby: many(validation_states, {
		relationName: "validation_states_releasedby_users_userid"
	}),
	validation_states_rejectedby: many(validation_states, {
		relationName: "validation_states_rejectedby_users_userid"
	}),
	validation_states_rerunrequestedby: many(validation_states, {
		relationName: "validation_states_rerunrequestedby_users_userid"
	}),
	workspaceusers: many(workspaceusers),
}));

export const sample_status_historyRelations = relations(sample_status_history, ({one}) => ({
	accession_sample: one(accession_samples, {
		fields: [sample_status_history.sampleid],
		references: [accession_samples.sampleid]
	}),
	user: one(users, {
		fields: [sample_status_history.changedby],
		references: [users.userid]
	}),
}));

export const appointmentsRelations = relations(appointments, ({one}) => ({
	patient: one(patients, {
		fields: [appointments.patientid],
		references: [patients.patientid]
	}),
	workspace: one(workspaces, {
		fields: [appointments.workspaceid],
		references: [workspaces.workspaceid]
	}),
}));

export const patientsRelations = relations(patients, ({one, many}) => ({
	appointments: many(appointments),
	operations: many(operations),
	workspace: one(workspaces, {
		fields: [patients.workspaceid],
		references: [workspaces.workspaceid]
	}),
	patient_insurances: many(patient_insurance),
	pharmacy_orders: many(pharmacy_orders),
	pharmacy_invoices: many(pharmacy_invoices),
	samples: many(samples),
}));

export const workspacesRelations = relations(workspaces, ({many}) => ({
	appointments: many(appointments),
	labs: many(labs),
	operations: many(operations),
	pharmacies: many(pharmacies),
	patients: many(patients),
	pharmacy_orders: many(pharmacy_orders),
	staff: many(staff),
	todos: many(todos),
	pharmacy_stock_locations: many(pharmacy_stock_locations),
	drugs: many(drugs),
	worklists: many(worklists),
	workspaceusers: many(workspaceusers),
}));

export const laboratory_typesRelations = relations(laboratory_types, ({one}) => ({
	user_createdby: one(users, {
		fields: [laboratory_types.createdby],
		references: [users.userid],
		relationName: "laboratory_types_createdby_users_userid"
	}),
	user_updatedby: one(users, {
		fields: [laboratory_types.updatedby],
		references: [users.userid],
		relationName: "laboratory_types_updatedby_users_userid"
	}),
}));

export const lims_order_testsRelations = relations(lims_order_tests, ({one}) => ({
	lims_order: one(lims_orders, {
		fields: [lims_order_tests.orderid],
		references: [lims_orders.orderid]
	}),
	lab_test_catalog: one(lab_test_catalog, {
		fields: [lims_order_tests.testid],
		references: [lab_test_catalog.testid]
	}),
	user: one(users, {
		fields: [lims_order_tests.resultedby],
		references: [users.userid]
	}),
}));

export const lims_ordersRelations = relations(lims_orders, ({one, many}) => ({
	lims_order_tests: many(lims_order_tests),
	user_orderingproviderid: one(users, {
		fields: [lims_orders.orderingproviderid],
		references: [users.userid],
		relationName: "lims_orders_orderingproviderid_users_userid"
	}),
	user_cancelledby: one(users, {
		fields: [lims_orders.cancelledby],
		references: [users.userid],
		relationName: "lims_orders_cancelledby_users_userid"
	}),
	accession_samples: many(accession_samples),
}));

export const lab_test_catalogRelations = relations(lab_test_catalog, ({many}) => ({
	lims_order_tests: many(lims_order_tests),
}));

export const labsRelations = relations(labs, ({one}) => ({
	workspace: one(workspaces, {
		fields: [labs.workspaceid],
		references: [workspaces.workspaceid]
	}),
}));

export const audit_logsRelations = relations(audit_logs, ({one}) => ({
	accession_sample: one(accession_samples, {
		fields: [audit_logs.sampleid],
		references: [accession_samples.sampleid]
	}),
	user: one(users, {
		fields: [audit_logs.userid],
		references: [users.userid]
	}),
}));

export const equipmentRelations = relations(equipment, ({one, many}) => ({
	user_createdby: one(users, {
		fields: [equipment.createdby],
		references: [users.userid],
		relationName: "equipment_createdby_users_userid"
	}),
	user_updatedby: one(users, {
		fields: [equipment.updatedby],
		references: [users.userid],
		relationName: "equipment_updatedby_users_userid"
	}),
	qc_runs: many(qc_runs),
}));

export const materialsRelations = relations(materials, ({one}) => ({
	supplier: one(suppliers, {
		fields: [materials.supplierid],
		references: [suppliers.supplierid]
	}),
	user_createdby: one(users, {
		fields: [materials.createdby],
		references: [users.userid],
		relationName: "materials_createdby_users_userid"
	}),
	user_updatedby: one(users, {
		fields: [materials.updatedby],
		references: [users.userid],
		relationName: "materials_updatedby_users_userid"
	}),
}));

export const suppliersRelations = relations(suppliers, ({one, many}) => ({
	materials: many(materials),
	user_createdby: one(users, {
		fields: [suppliers.createdby],
		references: [users.userid],
		relationName: "suppliers_createdby_users_userid"
	}),
	user_updatedby: one(users, {
		fields: [suppliers.updatedby],
		references: [users.userid],
		relationName: "suppliers_updatedby_users_userid"
	}),
}));

export const operationsRelations = relations(operations, ({one}) => ({
	patient: one(patients, {
		fields: [operations.patientid],
		references: [patients.patientid]
	}),
	user: one(users, {
		fields: [operations.surgeonid],
		references: [users.userid]
	}),
	workspace: one(workspaces, {
		fields: [operations.workspaceid],
		references: [workspaces.workspaceid]
	}),
}));

export const pharmaciesRelations = relations(pharmacies, ({one}) => ({
	workspace: one(workspaces, {
		fields: [pharmacies.workspaceid],
		references: [workspaces.workspaceid]
	}),
}));

export const drug_batchesRelations = relations(drug_batches, ({one, many}) => ({
	drug: one(drugs, {
		fields: [drug_batches.drugid],
		references: [drugs.drugid]
	}),
	pharmacy_stock_levels: many(pharmacy_stock_levels),
	pharmacy_order_items: many(pharmacy_order_items),
	pharmacy_stock_movements: many(pharmacy_stock_movements),
}));

export const drugsRelations = relations(drugs, ({one, many}) => ({
	drug_batches: many(drug_batches),
	pharmacy_invoice_lines: many(pharmacy_invoice_lines),
	pharmacy_stock_levels: many(pharmacy_stock_levels),
	pharmacy_order_items: many(pharmacy_order_items),
	pharmacy_stock_movements: many(pharmacy_stock_movements),
	pharmacy_substitutions_originaldrugid: many(pharmacy_substitutions, {
		relationName: "pharmacy_substitutions_originaldrugid_drugs_drugid"
	}),
	pharmacy_substitutions_newdrugid: many(pharmacy_substitutions, {
		relationName: "pharmacy_substitutions_newdrugid_drugs_drugid"
	}),
	workspace: one(workspaces, {
		fields: [drugs.workspaceid],
		references: [workspaces.workspaceid]
	}),
}));

export const study_protocolsRelations = relations(study_protocols, ({one}) => ({
	user: one(users, {
		fields: [study_protocols.principalinvestigatorid],
		references: [users.userid]
	}),
}));

export const patient_insuranceRelations = relations(patient_insurance, ({one}) => ({
	patient: one(patients, {
		fields: [patient_insurance.patientid],
		references: [patients.patientid]
	}),
}));

export const pharmacy_invoice_linesRelations = relations(pharmacy_invoice_lines, ({one}) => ({
	pharmacy_invoice: one(pharmacy_invoices, {
		fields: [pharmacy_invoice_lines.invoiceid],
		references: [pharmacy_invoices.invoiceid]
	}),
	drug: one(drugs, {
		fields: [pharmacy_invoice_lines.drugid],
		references: [drugs.drugid]
	}),
}));

export const pharmacy_invoicesRelations = relations(pharmacy_invoices, ({one, many}) => ({
	pharmacy_invoice_lines: many(pharmacy_invoice_lines),
	pharmacy_order: one(pharmacy_orders, {
		fields: [pharmacy_invoices.orderid],
		references: [pharmacy_orders.orderid]
	}),
	patient: one(patients, {
		fields: [pharmacy_invoices.patientid],
		references: [patients.patientid]
	}),
}));

export const pharmacy_ordersRelations = relations(pharmacy_orders, ({one, many}) => ({
	workspace: one(workspaces, {
		fields: [pharmacy_orders.workspaceid],
		references: [workspaces.workspaceid]
	}),
	patient: one(patients, {
		fields: [pharmacy_orders.patientid],
		references: [patients.patientid]
	}),
	pharmacy_order_items: many(pharmacy_order_items),
	pharmacy_invoices: many(pharmacy_invoices),
}));

export const staffRelations = relations(staff, ({one, many}) => ({
	workspace: one(workspaces, {
		fields: [staff.workspaceid],
		references: [workspaces.workspaceid]
	}),
	daily_attendances: many(daily_attendance),
	employee_schedules: many(employee_schedules),
}));

export const pharmacy_stock_levelsRelations = relations(pharmacy_stock_levels, ({one}) => ({
	drug: one(drugs, {
		fields: [pharmacy_stock_levels.drugid],
		references: [drugs.drugid]
	}),
	drug_batch: one(drug_batches, {
		fields: [pharmacy_stock_levels.batchid],
		references: [drug_batches.batchid]
	}),
	pharmacy_stock_location: one(pharmacy_stock_locations, {
		fields: [pharmacy_stock_levels.locationid],
		references: [pharmacy_stock_locations.locationid]
	}),
}));

export const pharmacy_stock_locationsRelations = relations(pharmacy_stock_locations, ({one, many}) => ({
	pharmacy_stock_levels: many(pharmacy_stock_levels),
	pharmacy_stock_movements: many(pharmacy_stock_movements),
	workspace: one(workspaces, {
		fields: [pharmacy_stock_locations.workspaceid],
		references: [workspaces.workspaceid]
	}),
}));

export const todosRelations = relations(todos, ({one}) => ({
	workspace: one(workspaces, {
		fields: [todos.workspaceid],
		references: [workspaces.workspaceid]
	}),
}));

export const pharmacy_order_itemsRelations = relations(pharmacy_order_items, ({one, many}) => ({
	pharmacy_order: one(pharmacy_orders, {
		fields: [pharmacy_order_items.orderid],
		references: [pharmacy_orders.orderid]
	}),
	drug: one(drugs, {
		fields: [pharmacy_order_items.drugid],
		references: [drugs.drugid]
	}),
	drug_batch: one(drug_batches, {
		fields: [pharmacy_order_items.batchid],
		references: [drug_batches.batchid]
	}),
	pharmacy_substitutions: many(pharmacy_substitutions),
}));

export const usersessionsRelations = relations(usersessions, ({one}) => ({
	user: one(users, {
		fields: [usersessions.userid],
		references: [users.userid]
	}),
}));

export const pharmacy_stock_movementsRelations = relations(pharmacy_stock_movements, ({one}) => ({
	drug: one(drugs, {
		fields: [pharmacy_stock_movements.drugid],
		references: [drugs.drugid]
	}),
	drug_batch: one(drug_batches, {
		fields: [pharmacy_stock_movements.batchid],
		references: [drug_batches.batchid]
	}),
	pharmacy_stock_location: one(pharmacy_stock_locations, {
		fields: [pharmacy_stock_movements.locationid],
		references: [pharmacy_stock_locations.locationid]
	}),
}));

export const pharmacy_substitutionsRelations = relations(pharmacy_substitutions, ({one}) => ({
	pharmacy_order_item: one(pharmacy_order_items, {
		fields: [pharmacy_substitutions.orderitemid],
		references: [pharmacy_order_items.itemid]
	}),
	drug_originaldrugid: one(drugs, {
		fields: [pharmacy_substitutions.originaldrugid],
		references: [drugs.drugid],
		relationName: "pharmacy_substitutions_originaldrugid_drugs_drugid"
	}),
	drug_newdrugid: one(drugs, {
		fields: [pharmacy_substitutions.newdrugid],
		references: [drugs.drugid],
		relationName: "pharmacy_substitutions_newdrugid_drugs_drugid"
	}),
}));

export const qc_runsRelations = relations(qc_runs, ({one}) => ({
	equipment: one(equipment, {
		fields: [qc_runs.equipmentid],
		references: [equipment.equipmentid]
	}),
	user: one(users, {
		fields: [qc_runs.performedby],
		references: [users.userid]
	}),
}));

export const shop_ordersRelations = relations(shop_orders, ({one, many}) => ({
	user_orderedby: one(users, {
		fields: [shop_orders.orderedby],
		references: [users.userid],
		relationName: "shop_orders_orderedby_users_userid"
	}),
	user_approvedby: one(users, {
		fields: [shop_orders.approvedby],
		references: [users.userid],
		relationName: "shop_orders_approvedby_users_userid"
	}),
	user_createdby: one(users, {
		fields: [shop_orders.createdby],
		references: [users.userid],
		relationName: "shop_orders_createdby_users_userid"
	}),
	user_updatedby: one(users, {
		fields: [shop_orders.updatedby],
		references: [users.userid],
		relationName: "shop_orders_updatedby_users_userid"
	}),
	shop_order_items: many(shop_order_items),
}));

export const test_resultsRelations = relations(test_results, ({one, many}) => ({
	accession_sample_sampleid: one(accession_samples, {
		fields: [test_results.sampleid],
		references: [accession_samples.sampleid],
		relationName: "test_results_sampleid_accession_samples_sampleid"
	}),
	accession_sample_accessionsampleid: one(accession_samples, {
		fields: [test_results.accessionsampleid],
		references: [accession_samples.sampleid],
		relationName: "test_results_accessionsampleid_accession_samples_sampleid"
	}),
	worklist: one(worklists, {
		fields: [test_results.worklistid],
		references: [worklists.worklistid]
	}),
	user_enteredby: one(users, {
		fields: [test_results.enteredby],
		references: [users.userid],
		relationName: "test_results_enteredby_users_userid"
	}),
	user_technicalvalidatedby: one(users, {
		fields: [test_results.technicalvalidatedby],
		references: [users.userid],
		relationName: "test_results_technicalvalidatedby_users_userid"
	}),
	user_medicalvalidatedby: one(users, {
		fields: [test_results.medicalvalidatedby],
		references: [users.userid],
		relationName: "test_results_medicalvalidatedby_users_userid"
	}),
	user_releasedby: one(users, {
		fields: [test_results.releasedby],
		references: [users.userid],
		relationName: "test_results_releasedby_users_userid"
	}),
	user_createdby: one(users, {
		fields: [test_results.createdby],
		references: [users.userid],
		relationName: "test_results_createdby_users_userid"
	}),
	user_updatedby: one(users, {
		fields: [test_results.updatedby],
		references: [users.userid],
		relationName: "test_results_updatedby_users_userid"
	}),
	result_validation_histories: many(result_validation_history),
}));

export const worklistsRelations = relations(worklists, ({one, many}) => ({
	test_results: many(test_results),
	workspace: one(workspaces, {
		fields: [worklists.workspaceid],
		references: [workspaces.workspaceid]
	}),
	worklist_items: many(worklist_items),
}));

export const result_validation_historyRelations = relations(result_validation_history, ({one}) => ({
	test_result: one(test_results, {
		fields: [result_validation_history.resultid],
		references: [test_results.resultid]
	}),
	user: one(users, {
		fields: [result_validation_history.validatedby],
		references: [users.userid]
	}),
}));

export const samplesRelations = relations(samples, ({one}) => ({
	patient: one(patients, {
		fields: [samples.patientid],
		references: [patients.patientid]
	}),
}));

export const sample_storageRelations = relations(sample_storage, ({one}) => ({
	accession_sample: one(accession_samples, {
		fields: [sample_storage.sampleid],
		references: [accession_samples.sampleid]
	}),
	storage_location: one(storage_locations, {
		fields: [sample_storage.locationid],
		references: [storage_locations.locationid]
	}),
	user_retrievedby: one(users, {
		fields: [sample_storage.retrievedby],
		references: [users.userid],
		relationName: "sample_storage_retrievedby_users_userid"
	}),
	user_disposedby: one(users, {
		fields: [sample_storage.disposedby],
		references: [users.userid],
		relationName: "sample_storage_disposedby_users_userid"
	}),
	user_storedby: one(users, {
		fields: [sample_storage.storedby],
		references: [users.userid],
		relationName: "sample_storage_storedby_users_userid"
	}),
}));

export const storage_locationsRelations = relations(storage_locations, ({one, many}) => ({
	sample_storages: many(sample_storage),
	user_createdby: one(users, {
		fields: [storage_locations.createdby],
		references: [users.userid],
		relationName: "storage_locations_createdby_users_userid"
	}),
	user_updatedby: one(users, {
		fields: [storage_locations.updatedby],
		references: [users.userid],
		relationName: "storage_locations_updatedby_users_userid"
	}),
}));

export const shop_order_itemsRelations = relations(shop_order_items, ({one}) => ({
	shop_order: one(shop_orders, {
		fields: [shop_order_items.orderid],
		references: [shop_orders.orderid]
	}),
}));

export const validation_statesRelations = relations(validation_states, ({one}) => ({
	accession_sample: one(accession_samples, {
		fields: [validation_states.sampleid],
		references: [accession_samples.sampleid]
	}),
	user_validatedby: one(users, {
		fields: [validation_states.validatedby],
		references: [users.userid],
		relationName: "validation_states_validatedby_users_userid"
	}),
	user_releasedby: one(users, {
		fields: [validation_states.releasedby],
		references: [users.userid],
		relationName: "validation_states_releasedby_users_userid"
	}),
	user_rejectedby: one(users, {
		fields: [validation_states.rejectedby],
		references: [users.userid],
		relationName: "validation_states_rejectedby_users_userid"
	}),
	user_rerunrequestedby: one(users, {
		fields: [validation_states.rerunrequestedby],
		references: [users.userid],
		relationName: "validation_states_rerunrequestedby_users_userid"
	}),
}));

export const worklist_itemsRelations = relations(worklist_items, ({one}) => ({
	worklist: one(worklists, {
		fields: [worklist_items.worklistid],
		references: [worklists.worklistid]
	}),
}));

export const invoice_itemsRelations = relations(invoice_items, ({one}) => ({
	invoice: one(invoices, {
		fields: [invoice_items.invoice_id],
		references: [invoices.id]
	}),
}));

export const invoicesRelations = relations(invoices, ({many}) => ({
	invoice_items: many(invoice_items),
}));

export const budget_categoriesRelations = relations(budget_categories, ({one}) => ({
	budget_period: one(budget_periods, {
		fields: [budget_categories.period_id],
		references: [budget_periods.id]
	}),
}));

export const budget_periodsRelations = relations(budget_periods, ({many}) => ({
	budget_categories: many(budget_categories),
}));

export const leave_requestsRelations = relations(leave_requests, ({one, many}) => ({
	leave_type: one(leave_types, {
		fields: [leave_requests.leave_type_id],
		references: [leave_types.id]
	}),
	leave_audit_logs: many(leave_audit_log),
	leave_request_approvals: many(leave_request_approvals),
}));

export const leave_typesRelations = relations(leave_types, ({many}) => ({
	leave_requests: many(leave_requests),
	leave_balances: many(leave_balance),
	leave_policy_rules: many(leave_policy_rules),
	leave_approval_workflows: many(leave_approval_workflow),
}));

export const leave_balanceRelations = relations(leave_balance, ({one}) => ({
	leave_type: one(leave_types, {
		fields: [leave_balance.leave_type_id],
		references: [leave_types.id]
	}),
}));

export const shift_assignmentsRelations = relations(shift_assignments, ({one}) => ({
	shift: one(shifts, {
		fields: [shift_assignments.shift_id],
		references: [shifts.id]
	}),
}));

export const shiftsRelations = relations(shifts, ({many}) => ({
	shift_assignments: many(shift_assignments),
	employee_schedules: many(employee_schedules),
	schedule_exceptions: many(schedule_exceptions),
}));

export const daily_attendanceRelations = relations(daily_attendance, ({one}) => ({
	staff: one(staff, {
		fields: [daily_attendance.employee_id],
		references: [staff.staffid]
	}),
}));

export const employeesRelations = relations(employees, ({one, many}) => ({
	employee: one(employees, {
		fields: [employees.reporting_to],
		references: [employees.employee_id],
		relationName: "employees_reporting_to_employees_employee_id"
	}),
	employees: many(employees, {
		relationName: "employees_reporting_to_employees_employee_id"
	}),
	schedule_exceptions: many(schedule_exceptions),
	employee_rotation_assignments: many(employee_rotation_assignments),
}));

export const employee_schedulesRelations = relations(employee_schedules, ({one, many}) => ({
	shift: one(shifts, {
		fields: [employee_schedules.shift_id],
		references: [shifts.id]
	}),
	staff: one(staff, {
		fields: [employee_schedules.employee_id],
		references: [staff.staffid]
	}),
	daily_schedule_details: many(daily_schedule_details),
}));

export const daily_schedule_detailsRelations = relations(daily_schedule_details, ({one}) => ({
	employee_schedule: one(employee_schedules, {
		fields: [daily_schedule_details.schedule_id],
		references: [employee_schedules.id]
	}),
}));

export const schedule_exceptionsRelations = relations(schedule_exceptions, ({one}) => ({
	employee: one(employees, {
		fields: [schedule_exceptions.employee_id],
		references: [employees.id]
	}),
	shift: one(shifts, {
		fields: [schedule_exceptions.modified_shift_id],
		references: [shifts.id]
	}),
}));

export const employee_rotation_assignmentsRelations = relations(employee_rotation_assignments, ({one}) => ({
	employee: one(employees, {
		fields: [employee_rotation_assignments.employee_id],
		references: [employees.id]
	}),
	shift_rotation: one(shift_rotations, {
		fields: [employee_rotation_assignments.rotation_id],
		references: [shift_rotations.id]
	}),
}));

export const shift_rotationsRelations = relations(shift_rotations, ({many}) => ({
	employee_rotation_assignments: many(employee_rotation_assignments),
}));

export const leave_policy_rulesRelations = relations(leave_policy_rules, ({one}) => ({
	leave_type: one(leave_types, {
		fields: [leave_policy_rules.leave_type_id],
		references: [leave_types.id]
	}),
}));

export const leave_audit_logRelations = relations(leave_audit_log, ({one}) => ({
	leave_request: one(leave_requests, {
		fields: [leave_audit_log.leave_request_id],
		references: [leave_requests.id]
	}),
}));

export const leave_approval_workflowRelations = relations(leave_approval_workflow, ({one}) => ({
	leave_type: one(leave_types, {
		fields: [leave_approval_workflow.leave_type_id],
		references: [leave_types.id]
	}),
}));

export const leave_request_approvalsRelations = relations(leave_request_approvals, ({one}) => ({
	leave_request: one(leave_requests, {
		fields: [leave_request_approvals.leave_request_id],
		references: [leave_requests.id]
	}),
}));

export const workspaceusersRelations = relations(workspaceusers, ({one}) => ({
	user: one(users, {
		fields: [workspaceusers.userid],
		references: [users.userid]
	}),
	workspace: one(workspaces, {
		fields: [workspaceusers.workspaceid],
		references: [workspaces.workspaceid]
	}),
}));