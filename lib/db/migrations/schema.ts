import { pgTable, index, foreignKey, pgEnum, uuid, text, timestamp, jsonb, unique, integer, boolean, numeric, date, varchar, inet, time, primaryKey } from "drizzle-orm/pg-core"
  import { sql } from "drizzle-orm"

export const appointment_name = pgEnum("appointment_name", ['new_patient', 're_visit', 'follow_up'])
export const appointment_status = pgEnum("appointment_status", ['scheduled', 'checked_in', 'in_progress', 'completed', 'cancelled'])
export const appointment_type = pgEnum("appointment_type", ['visiting', 'video_call', 'home_visit'])
export const operation_status = pgEnum("operation_status", ['scheduled', 'in_preparation', 'in_progress', 'completed', 'cancelled', 'postponed'])
export const operation_type = pgEnum("operation_type", ['emergency', 'elective', 'urgent'])


export const sample_accession_audit_log = pgTable("sample_accession_audit_log", {
	auditid: uuid("auditid").defaultRandom().primaryKey().notNull(),
	sampleid: uuid("sampleid").notNull().references(() => accession_samples.sampleid),
	action: text("action").notNull(),
	userid: uuid("userid").notNull().references(() => users.userid),
	userrole: text("userrole"),
	previousdata: text("previousdata"),
	newdata: text("newdata"),
	reason: text("reason"),
	metadata: text("metadata"),
	createdat: timestamp("createdat", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	ipaddress: text("ipaddress"),
	sessionid: text("sessionid"),
},
(table) => {
	return {
		sample_accession_audit_action_idx: index("sample_accession_audit_action_idx").using("btree", table.action),
		sample_accession_audit_sample_idx: index("sample_accession_audit_sample_idx").using("btree", table.sampleid),
		sample_accession_audit_timestamp_idx: index("sample_accession_audit_timestamp_idx").using("btree", table.createdat),
		sample_accession_audit_user_idx: index("sample_accession_audit_user_idx").using("btree", table.userid),
	}
});

export const sample_status_history = pgTable("sample_status_history", {
	historyid: uuid("historyid").defaultRandom().primaryKey().notNull(),
	sampleid: uuid("sampleid").notNull().references(() => accession_samples.sampleid),
	previousstatus: text("previousstatus"),
	newstatus: text("newstatus").notNull(),
	previouslocation: text("previouslocation"),
	newlocation: text("newlocation"),
	changedby: uuid("changedby").notNull().references(() => users.userid),
	changedat: timestamp("changedat", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	changereason: text("changereason"),
	metadata: text("metadata"),
},
(table) => {
	return {
		sample_idx: index("sample_status_history_sample_idx").using("btree", table.sampleid),
		status_idx: index("sample_status_history_status_idx").using("btree", table.newstatus),
	}
});

export const appointments = pgTable("appointments", {
	appointmentid: uuid("appointmentid").defaultRandom().primaryKey().notNull(),
	workspaceid: uuid("workspaceid").notNull().references(() => workspaces.workspaceid, { onDelete: "cascade" } ),
	patientid: uuid("patientid").notNull().references(() => patients.patientid, { onDelete: "cascade" } ),
	doctorid: uuid("doctorid").notNull(),
	starttime: timestamp("starttime", { withTimezone: true, mode: 'string' }).notNull(),
	endtime: timestamp("endtime", { withTimezone: true, mode: 'string' }).notNull(),
	location: text("location"),
	status: appointment_status("status").default('scheduled').notNull(),
	notes: jsonb("notes").default({}),
	createdat: timestamp("createdat", { mode: 'string' }).defaultNow(),
	updatedat: timestamp("updatedat", { mode: 'string' }).defaultNow(),
	unit: text("unit"),
	appointmentname: appointment_name("appointmentname").default('new_patient').notNull(),
	appointmenttype: appointment_type("appointmenttype").default('visiting').notNull(),
	clinicalindication: text("clinicalindication"),
	reasonforrequest: text("reasonforrequest"),
	description: text("description"),
	staff_id: uuid("staff_id"),
});

export const laboratory_types = pgTable("laboratory_types", {
	typeid: uuid("typeid").defaultRandom().primaryKey().notNull(),
	name: text("name").notNull(),
	code: text("code").notNull(),
	description: text("description"),
	category: text("category").notNull(),
	specialization: text("specialization"),
	parenttypeid: uuid("parenttypeid"),
	sortorder: integer("sortorder").default(0),
	isactive: boolean("isactive").default(true),
	createdby: uuid("createdby").notNull().references(() => users.userid),
	createdat: text("createdat").notNull(),
	updatedby: uuid("updatedby").references(() => users.userid),
	updatedat: text("updatedat"),
	workspaceid: text("workspaceid").notNull(),
},
(table) => {
	return {
		category_idx: index("laboratory_types_category_idx").using("btree", table.category),
		is_active_idx: index("laboratory_types_is_active_idx").using("btree", table.isactive),
		name_idx: index("laboratory_types_name_idx").using("btree", table.name),
		workspace_idx: index("laboratory_types_workspace_idx").using("btree", table.workspaceid),
		laboratory_types_code_unique: unique("laboratory_types_code_unique").on(table.code),
	}
});

export const lims_order_tests = pgTable("lims_order_tests", {
	ordertestid: uuid("ordertestid").defaultRandom().primaryKey().notNull(),
	orderid: uuid("orderid").notNull().references(() => lims_orders.orderid, { onDelete: "cascade" } ),
	testid: uuid("testid").references(() => lab_test_catalog.testid),
	testcode: text("testcode"),
	testname: text("testname"),
	teststatus: text("teststatus").default('REQUESTED').notNull(),
	specimenid: uuid("specimenid"),
	resultvalue: text("resultvalue"),
	resultunit: text("resultunit"),
	resultstatus: text("resultstatus"),
	resultedby: uuid("resultedby").references(() => users.userid),
	resultedat: timestamp("resultedat", { withTimezone: true, mode: 'string' }),
	createdat: timestamp("createdat", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedat: timestamp("updatedat", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		order_idx: index("lims_order_tests_order_idx").using("btree", table.orderid),
		status_idx: index("lims_order_tests_status_idx").using("btree", table.teststatus),
		test_idx: index("lims_order_tests_test_idx").using("btree", table.testid),
	}
});

export const labs = pgTable("labs", {
	labid: uuid("labid").defaultRandom().primaryKey().notNull(),
	workspaceid: uuid("workspaceid").notNull().references(() => workspaces.workspaceid, { onDelete: "cascade" } ),
	name: text("name").notNull(),
	phone: text("phone"),
	email: text("email"),
	address: text("address"),
	createdat: timestamp("createdat", { mode: 'string' }).defaultNow().notNull(),
	updatedat: timestamp("updatedat", { mode: 'string' }).defaultNow().notNull(),
});

export const lab_test_catalog = pgTable("lab_test_catalog", {
	testid: uuid("testid").defaultRandom().primaryKey().notNull(),
	testcode: text("testcode").notNull(),
	testname: text("testname").notNull(),
	testdescription: text("testdescription"),
	testcategory: text("testcategory").notNull(),
	testpanel: text("testpanel"),
	loinccode: text("loinccode"),
	loincname: text("loincname"),
	snomedcode: text("snomedcode"),
	snomedname: text("snomedname"),
	specimentype: text("specimentype").notNull(),
	specimenvolume: text("specimenvolume"),
	specimencontainer: text("specimencontainer"),
	turnaroundtime: text("turnaroundtime"),
	fastingrequired: boolean("fastingrequired").default(false),
	isactive: boolean("isactive").default(true).notNull(),
	workspaceid: text("workspaceid").notNull(),
	createdat: timestamp("createdat", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedat: timestamp("updatedat", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		active_idx: index("lab_test_catalog_active_idx").using("btree", table.isactive),
		category_idx: index("lab_test_catalog_category_idx").using("btree", table.testcategory),
		code_idx: index("lab_test_catalog_code_idx").using("btree", table.testcode),
		workspace_idx: index("lab_test_catalog_workspace_idx").using("btree", table.workspaceid),
		lab_test_catalog_testcode_unique: unique("lab_test_catalog_testcode_unique").on(table.testcode),
	}
});

export const audit_logs = pgTable("audit_logs", {
	auditid: uuid("auditid").defaultRandom().primaryKey().notNull(),
	sampleid: uuid("sampleid").notNull().references(() => accession_samples.sampleid, { onDelete: "cascade" } ),
	userid: uuid("userid").notNull().references(() => users.userid),
	userrole: text("userrole").notNull(),
	action: text("action").notNull(),
	previousstate: text("previousstate"),
	newstate: text("newstate").notNull(),
	reason: text("reason"),
	metadata: jsonb("metadata").default({}),
	ipaddress: text("ipaddress"),
	useragent: text("useragent"),
	timestamp: timestamp("timestamp", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		action_idx: index("audit_logs_action_idx").using("btree", table.action),
		sampleid_idx: index("audit_logs_sampleid_idx").using("btree", table.sampleid),
		timestamp_idx: index("audit_logs_timestamp_idx").using("btree", table.timestamp),
		userid_idx: index("audit_logs_userid_idx").using("btree", table.userid),
	}
});

export const equipment = pgTable("equipment", {
	equipmentid: uuid("equipmentid").defaultRandom().primaryKey().notNull(),
	model: text("model").notNull(),
	equipmentidcode: text("equipmentidcode").notNull(),
	serialnumber: text("serialnumber").notNull(),
	vendor: text("vendor").notNull(),
	vendoremail: text("vendoremail"),
	vendorphone: text("vendorphone"),
	lastservicedate: timestamp("lastservicedate", { mode: 'string' }),
	nextservicedate: timestamp("nextservicedate", { mode: 'string' }),
	serviceinterval: integer("serviceinterval"),
	warrantyexpiry: timestamp("warrantyexpiry", { mode: 'string' }),
	category: text("category").notNull(),
	type: text("type").notNull(),
	status: text("status").default('active').notNull(),
	location: text("location"),
	calibrationdate: timestamp("calibrationdate", { mode: 'string' }),
	nextcalibrationdate: timestamp("nextcalibrationdate", { mode: 'string' }),
	calibrationinterval: integer("calibrationinterval"),
	purchaseprice: numeric("purchaseprice", { precision: 10, scale:  2 }),
	currentvalue: numeric("currentvalue", { precision: 10, scale:  2 }),
	notes: text("notes"),
	manualurl: text("manualurl"),
	specifications: text("specifications"),
	createdby: uuid("createdby").notNull().references(() => users.userid),
	createdat: text("createdat").notNull(),
	updatedby: uuid("updatedby").references(() => users.userid),
	updatedat: text("updatedat"),
	workspaceid: text("workspaceid").notNull(),
},
(table) => {
	return {
		id_code_idx: index("equipment_id_code_idx").using("btree", table.equipmentidcode),
		model_idx: index("equipment_model_idx").using("btree", table.model),
		serial_number_idx: index("equipment_serial_number_idx").using("btree", table.serialnumber),
		status_idx: index("equipment_status_idx").using("btree", table.status),
		vendor_idx: index("equipment_vendor_idx").using("btree", table.vendor),
		workspace_idx: index("equipment_workspace_idx").using("btree", table.workspaceid),
		equipment_equipmentidcode_unique: unique("equipment_equipmentidcode_unique").on(table.equipmentidcode),
		equipment_serialnumber_unique: unique("equipment_serialnumber_unique").on(table.serialnumber),
	}
});

export const materials = pgTable("materials", {
	materialid: uuid("materialid").defaultRandom().primaryKey().notNull(),
	name: text("name").notNull(),
	code: text("code").notNull(),
	description: text("description"),
	lotnumber: text("lotnumber").notNull(),
	batchnumber: text("batchnumber"),
	manufacturedate: timestamp("manufacturedate", { mode: 'string' }),
	expirydate: timestamp("expirydate", { mode: 'string' }),
	supplierid: uuid("supplierid").references(() => suppliers.supplierid),
	suppliername: text("suppliername").notNull(),
	suppliernumber: text("suppliernumber"),
	size: text("size"),
	unit: text("unit").notNull(),
	quantity: numeric("quantity", { precision: 10, scale:  2 }).notNull(),
	minquantity: numeric("minquantity", { precision: 10, scale:  2 }),
	maxquantity: numeric("maxquantity", { precision: 10, scale:  2 }),
	storage: text("storage").notNull(),
	storagelocation: text("storagelocation"),
	storageconditions: text("storageconditions"),
	price: numeric("price", { precision: 10, scale:  2 }),
	totalcost: numeric("totalcost", { precision: 12, scale:  2 }),
	currency: text("currency").default('USD'),
	category: text("category").notNull(),
	type: text("type").notNull(),
	hazardlevel: text("hazardlevel"),
	casnumber: text("casnumber"),
	qualitygrade: text("qualitygrade"),
	certificatenumber: text("certificatenumber"),
	testrequired: boolean("testrequired").default(false),
	status: text("status").default('active').notNull(),
	isavailable: boolean("isavailable").default(true),
	notes: text("notes"),
	msdsurl: text("msdsurl"),
	specifications: text("specifications"),
	createdby: uuid("createdby").notNull().references(() => users.userid),
	createdat: text("createdat").notNull(),
	updatedby: uuid("updatedby").references(() => users.userid),
	updatedat: text("updatedat"),
	workspaceid: text("workspaceid").notNull(),
},
(table) => {
	return {
		category_idx: index("materials_category_idx").using("btree", table.category),
		expiry_date_idx: index("materials_expiry_date_idx").using("btree", table.expirydate),
		lot_number_idx: index("materials_lot_number_idx").using("btree", table.lotnumber),
		name_idx: index("materials_name_idx").using("btree", table.name),
		status_idx: index("materials_status_idx").using("btree", table.status),
		supplier_idx: index("materials_supplier_idx").using("btree", table.supplierid),
		workspace_idx: index("materials_workspace_idx").using("btree", table.workspaceid),
		materials_code_unique: unique("materials_code_unique").on(table.code),
	}
});

export const operations = pgTable("operations", {
	operationid: uuid("operationid").defaultRandom().primaryKey().notNull(),
	workspaceid: uuid("workspaceid").notNull().references(() => workspaces.workspaceid, { onDelete: "cascade" } ),
	patientid: uuid("patientid").notNull().references(() => patients.patientid, { onDelete: "cascade" } ),
	surgeonid: uuid("surgeonid").notNull().references(() => users.userid, { onDelete: "cascade" } ),
	scheduleddate: timestamp("scheduleddate", { withTimezone: true, mode: 'string' }).notNull(),
	estimatedduration: text("estimatedduration"),
	operationtype: operation_type("operationtype").default('elective').notNull(),
	status: operation_status("status").default('scheduled').notNull(),
	preoperativeassessment: text("preoperativeassessment"),
	operationname: text("operationname").notNull(),
	operationdetails: text("operationdetails"),
	anesthesiatype: text("anesthesiatype"),
	theater: text("theater"),
	operationdiagnosis: text("operationdiagnosis"),
	actualstarttime: timestamp("actualstarttime", { withTimezone: true, mode: 'string' }),
	actualendtime: timestamp("actualendtime", { withTimezone: true, mode: 'string' }),
	outcomes: text("outcomes"),
	complications: text("complications"),
	comment: text("comment"),
	createdat: timestamp("createdat", { mode: 'string' }).defaultNow(),
	updatedat: timestamp("updatedat", { mode: 'string' }).defaultNow(),
});

export const pharmacies = pgTable("pharmacies", {
	pharmacyid: uuid("pharmacyid").defaultRandom().primaryKey().notNull(),
	workspaceid: uuid("workspaceid").notNull().references(() => workspaces.workspaceid, { onDelete: "cascade" } ),
	name: text("name").notNull(),
	phone: text("phone"),
	email: text("email"),
	address: text("address"),
	createdat: timestamp("createdat", { mode: 'string' }).defaultNow().notNull(),
	updatedat: timestamp("updatedat", { mode: 'string' }).defaultNow().notNull(),
});

export const drug_batches = pgTable("drug_batches", {
	batchid: uuid("batchid").defaultRandom().primaryKey().notNull(),
	drugid: uuid("drugid").notNull().references(() => drugs.drugid, { onDelete: "cascade" } ),
	lotnumber: text("lotnumber").notNull(),
	expirydate: date("expirydate").notNull(),
	purchaseprice: numeric("purchaseprice", { precision: 12, scale:  2 }),
	sellingprice: numeric("sellingprice", { precision: 12, scale:  2 }),
	barcode: text("barcode"),
	createdat: timestamp("createdat", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		drug_idx: index("drug_batches_drug_idx").using("btree", table.drugid),
		expiry_idx: index("drug_batches_expiry_idx").using("btree", table.expirydate),
	}
});

export const lims_orders = pgTable("lims_orders", {
	orderid: uuid("orderid").defaultRandom().primaryKey().notNull(),
	subjecttype: text("subjecttype").notNull(),
	subjectidentifier: text("subjectidentifier").notNull(),
	encounterid: text("encounterid"),
	studyprotocolid: text("studyprotocolid"),
	priority: text("priority").default('ROUTINE').notNull(),
	status: text("status").default('REQUESTED').notNull(),
	orderingproviderid: uuid("orderingproviderid").notNull().references(() => users.userid),
	orderingprovidername: text("orderingprovidername"),
	sourcesystem: text("sourcesystem").default('LIMS_UI').notNull(),
	clinicalindication: text("clinicalindication"),
	clinicalnotes: text("clinicalnotes"),
	statjustification: text("statjustification"),
	ehrid: text("ehrid"),
	compositionuid: text("compositionuid"),
	openehrrequestid: text("openehrrequestid"),
	timecommitted: timestamp("timecommitted", { withTimezone: true, mode: 'string' }),
	fhirservicerequestid: text("fhirservicerequestid"),
	sample_type: text("sample_type"),
	container_type: text("container_type"),
	volume: text("volume"),
	volume_unit: text("volume_unit").default('mL'),
	sample_recommendations: jsonb("sample_recommendations"),
	workspaceid: text("workspaceid").notNull(),
	createdat: timestamp("createdat", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedat: timestamp("updatedat", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	cancelledat: timestamp("cancelledat", { withTimezone: true, mode: 'string' }),
	cancelledby: uuid("cancelledby").references(() => users.userid),
	cancellationreason: text("cancellationreason"),
},
(table) => {
	return {
		created_idx: index("lims_orders_created_idx").using("btree", table.createdat),
		provider_idx: index("lims_orders_provider_idx").using("btree", table.orderingproviderid),
		status_idx: index("lims_orders_status_idx").using("btree", table.status),
		subject_idx: index("lims_orders_subject_idx").using("btree", table.subjectidentifier),
		workspace_idx: index("lims_orders_workspace_idx").using("btree", table.workspaceid),
	}
});

export const study_protocols = pgTable("study_protocols", {
	protocolid: uuid("protocolid").defaultRandom().primaryKey().notNull(),
	protocolnumber: text("protocolnumber").notNull(),
	protocolname: text("protocolname").notNull(),
	protocoldescription: text("protocoldescription"),
	principalinvestigatorid: uuid("principalinvestigatorid").references(() => users.userid),
	principalinvestigatorname: text("principalinvestigatorname"),
	irbapprovaldate: timestamp("irbapprovaldate", { withTimezone: true, mode: 'string' }),
	irbapprovalnumber: text("irbapprovalnumber"),
	isactive: boolean("isactive").default(true).notNull(),
	workspaceid: text("workspaceid").notNull(),
	createdat: timestamp("createdat", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedat: timestamp("updatedat", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		active_idx: index("study_protocols_active_idx").using("btree", table.isactive),
		number_idx: index("study_protocols_number_idx").using("btree", table.protocolnumber),
		workspace_idx: index("study_protocols_workspace_idx").using("btree", table.workspaceid),
		study_protocols_protocolnumber_unique: unique("study_protocols_protocolnumber_unique").on(table.protocolnumber),
	}
});

export const patients = pgTable("patients", {
	patientid: uuid("patientid").defaultRandom().primaryKey().notNull(),
	workspaceid: uuid("workspaceid").notNull().references(() => workspaces.workspaceid, { onDelete: "cascade" } ),
	firstname: text("firstname").notNull(),
	middlename: text("middlename"),
	lastname: text("lastname").notNull(),
	nationalid: text("nationalid"),
	dateofbirth: date("dateofbirth"),
	phone: text("phone"),
	email: text("email"),
	address: text("address"),
	medicalhistory: jsonb("medicalhistory").default({}),
	createdat: timestamp("createdat", { mode: 'string' }).defaultNow(),
	updatedat: timestamp("updatedat", { mode: 'string' }).defaultNow(),
	ehrid: text("ehrid"),
	gender: text("gender"),
	bloodgroup: text("bloodgroup"),
},
(table) => {
	return {
		workspace_idx: index("patients_workspace_idx").using("btree", table.workspaceid),
	}
});

export const patient_insurance = pgTable("patient_insurance", {
	patientinsuranceid: uuid("patientinsuranceid").defaultRandom().primaryKey().notNull(),
	patientid: uuid("patientid").notNull().references(() => patients.patientid, { onDelete: "cascade" } ),
	insuranceid: uuid("insuranceid").notNull(),
	policynumber: text("policynumber").notNull(),
	groupnumber: text("groupnumber"),
	startdate: date("startdate"),
	enddate: date("enddate"),
	isprimary: boolean("isprimary").default(true).notNull(),
	isactive: boolean("isactive").default(true).notNull(),
	createdat: timestamp("createdat", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		ins_idx: index("patient_insurance_ins_idx").using("btree", table.insuranceid),
		patient_idx: index("patient_insurance_patient_idx").using("btree", table.patientid),
	}
});

export const pharmacy_invoice_lines = pgTable("pharmacy_invoice_lines", {
	lineid: uuid("lineid").defaultRandom().primaryKey().notNull(),
	invoiceid: uuid("invoiceid").notNull().references(() => pharmacy_invoices.invoiceid, { onDelete: "cascade" } ),
	drugid: uuid("drugid").references(() => drugs.drugid, { onDelete: "set null" } ),
	description: text("description").notNull(),
	quantity: integer("quantity").default(1).notNull(),
	unitprice: numeric("unitprice", { precision: 12, scale:  2 }).notNull(),
	linetotal: numeric("linetotal", { precision: 12, scale:  2 }).notNull(),
	insurancecovered: numeric("insurancecovered", { precision: 12, scale:  2 }).default('0').notNull(),
	patientpays: numeric("patientpays", { precision: 12, scale:  2 }).default('0').notNull(),
	createdat: timestamp("createdat", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		inv_idx: index("pharmacy_invoice_lines_inv_idx").using("btree", table.invoiceid),
	}
});

export const pharmacy_orders = pgTable("pharmacy_orders", {
	orderid: uuid("orderid").defaultRandom().primaryKey().notNull(),
	workspaceid: uuid("workspaceid").notNull().references(() => workspaces.workspaceid, { onDelete: "cascade" } ),
	patientid: uuid("patientid").references(() => patients.patientid, { onDelete: "set null" } ),
	prescriberid: uuid("prescriberid"),
	status: text("status").default('PENDING').notNull(),
	source: text("source").default('manual').notNull(),
	openehrorderid: text("openehrorderid"),
	priority: text("priority").default('routine').notNull(),
	notes: text("notes"),
	metadata: jsonb("metadata").default({}),
	dispensedby: uuid("dispensedby"),
	dispensedat: timestamp("dispensedat", { withTimezone: true, mode: 'string' }),
	createdat: timestamp("createdat", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedat: timestamp("updatedat", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		openehr_idx: index("pharmacy_orders_openehr_idx").using("btree", table.openehrorderid),
		patient_idx: index("pharmacy_orders_patient_idx").using("btree", table.patientid),
		status_idx: index("pharmacy_orders_status_idx").using("btree", table.status),
		ws_idx: index("pharmacy_orders_ws_idx").using("btree", table.workspaceid),
	}
});

export const staff = pgTable("staff", {
	staffid: uuid("staffid").defaultRandom().primaryKey().notNull(),
	workspaceid: uuid("workspaceid").notNull().references(() => workspaces.workspaceid, { onDelete: "cascade" } ),
	role: text("role").notNull(),
	firstname: text("firstname").notNull(),
	middlename: text("middlename"),
	lastname: text("lastname").notNull(),
	unit: text("unit"),
	specialty: text("specialty"),
	phone: text("phone"),
	email: text("email"),
	createdat: timestamp("createdat", { mode: 'string' }).defaultNow().notNull(),
	updatedat: timestamp("updatedat", { mode: 'string' }).defaultNow().notNull(),
	dateofbirth: date("dateofbirth"),
	custom_staff_id: varchar("custom_staff_id", { length: 20 }),
});

export const pharmacy_stock_levels = pgTable("pharmacy_stock_levels", {
	stocklevelid: uuid("stocklevelid").defaultRandom().primaryKey().notNull(),
	drugid: uuid("drugid").notNull().references(() => drugs.drugid, { onDelete: "cascade" } ),
	batchid: uuid("batchid").references(() => drug_batches.batchid, { onDelete: "set null" } ),
	locationid: uuid("locationid").notNull().references(() => pharmacy_stock_locations.locationid, { onDelete: "cascade" } ),
	quantity: integer("quantity").default(0).notNull(),
	updatedat: timestamp("updatedat", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		drug_idx: index("pharmacy_stock_levels_drug_idx").using("btree", table.drugid),
		loc_idx: index("pharmacy_stock_levels_loc_idx").using("btree", table.locationid),
	}
});

export const todos = pgTable("todos", {
	todoid: uuid("todoid").defaultRandom().primaryKey().notNull(),
	workspaceid: uuid("workspaceid").notNull().references(() => workspaces.workspaceid, { onDelete: "cascade" } ),
	userid: uuid("userid").notNull(),
	title: text("title").notNull(),
	description: text("description"),
	completed: boolean("completed").default(false).notNull(),
	priority: text("priority").default('medium').notNull(),
	duedate: timestamp("duedate", { withTimezone: true, mode: 'string' }),
	createdat: timestamp("createdat", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedat: timestamp("updatedat", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		user_idx: index("todos_user_idx").using("btree", table.userid),
		workspace_idx: index("todos_workspace_idx").using("btree", table.workspaceid),
	}
});

export const pharmacy_order_items = pgTable("pharmacy_order_items", {
	itemid: uuid("itemid").defaultRandom().primaryKey().notNull(),
	orderid: uuid("orderid").notNull().references(() => pharmacy_orders.orderid, { onDelete: "cascade" } ),
	drugid: uuid("drugid").references(() => drugs.drugid, { onDelete: "set null" } ),
	batchid: uuid("batchid").references(() => drug_batches.batchid, { onDelete: "set null" } ),
	drugname: text("drugname").notNull(),
	dosage: text("dosage"),
	quantity: integer("quantity").default(1).notNull(),
	unitprice: numeric("unitprice", { precision: 12, scale:  2 }),
	status: text("status").default('PENDING').notNull(),
	scannedbarcode: text("scannedbarcode"),
	scannedat: timestamp("scannedat", { withTimezone: true, mode: 'string' }),
	notes: text("notes"),
	createdat: timestamp("createdat", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		drug_idx: index("pharmacy_order_items_drug_idx").using("btree", table.drugid),
		order_idx: index("pharmacy_order_items_order_idx").using("btree", table.orderid),
	}
});

export const usersessions = pgTable("usersessions", {
	sessionid: uuid("sessionid").defaultRandom().primaryKey().notNull(),
	userid: uuid("userid").notNull().references(() => users.userid, { onDelete: "cascade" } ),
	sessiontoken: text("sessiontoken").notNull(),
	deviceinfo: text("deviceinfo"),
	ipaddress: text("ipaddress"),
	useragent: text("useragent"),
	createdat: timestamp("createdat", { mode: 'string' }).defaultNow().notNull(),
	lastactive: timestamp("lastactive", { mode: 'string' }).defaultNow().notNull(),
	expiresat: timestamp("expiresat", { mode: 'string' }).notNull(),
},
(table) => {
	return {
		usersessions_sessiontoken_unique: unique("usersessions_sessiontoken_unique").on(table.sessiontoken),
	}
});

export const pharmacy_stock_movements = pgTable("pharmacy_stock_movements", {
	movementid: uuid("movementid").defaultRandom().primaryKey().notNull(),
	drugid: uuid("drugid").notNull().references(() => drugs.drugid, { onDelete: "cascade" } ),
	batchid: uuid("batchid").references(() => drug_batches.batchid, { onDelete: "set null" } ),
	locationid: uuid("locationid").notNull().references(() => pharmacy_stock_locations.locationid, { onDelete: "cascade" } ),
	type: text("type").notNull(),
	quantity: integer("quantity").notNull(),
	reason: text("reason"),
	referenceid: text("referenceid"),
	performedby: uuid("performedby"),
	createdat: timestamp("createdat", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		drug_idx: index("pharmacy_stock_movements_drug_idx").using("btree", table.drugid),
		type_idx: index("pharmacy_stock_movements_type_idx").using("btree", table.type),
	}
});

export const pharmacy_substitutions = pgTable("pharmacy_substitutions", {
	substitutionid: uuid("substitutionid").defaultRandom().primaryKey().notNull(),
	orderitemid: uuid("orderitemid").notNull().references(() => pharmacy_order_items.itemid, { onDelete: "cascade" } ),
	originaldrugid: uuid("originaldrugid").references(() => drugs.drugid, { onDelete: "set null" } ),
	newdrugid: uuid("newdrugid").notNull().references(() => drugs.drugid, { onDelete: "cascade" } ),
	reason: text("reason").notNull(),
	approvedby: uuid("approvedby"),
	createdat: timestamp("createdat", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		item_idx: index("pharmacy_substitutions_item_idx").using("btree", table.orderitemid),
	}
});

export const qc_runs = pgTable("qc_runs", {
	qcid: uuid("qcid").defaultRandom().primaryKey().notNull(),
	qctype: text("qctype").notNull(),
	equipmentid: uuid("equipmentid").references(() => equipment.equipmentid),
	equipmentname: text("equipmentname"),
	qclevel: text("qclevel"),
	lotnumber: text("lotnumber"),
	analyte: text("analyte"),
	resultvalue: numeric("resultvalue", { precision: 15, scale:  4 }),
	unit: text("unit"),
	expectedmin: numeric("expectedmin", { precision: 15, scale:  4 }),
	expectedmax: numeric("expectedmax", { precision: 15, scale:  4 }),
	pass: boolean("pass").default(true).notNull(),
	notes: text("notes"),
	runat: timestamp("runat", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	performedby: uuid("performedby").references(() => users.userid),
	performedbyname: text("performedbyname"),
	workspaceid: text("workspaceid").notNull(),
	createdat: timestamp("createdat", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		equipment_idx: index("qc_runs_equipment_idx").using("btree", table.equipmentid),
		runat_idx: index("qc_runs_runat_idx").using("btree", table.runat),
		type_idx: index("qc_runs_type_idx").using("btree", table.qctype),
		workspace_idx: index("qc_runs_workspace_idx").using("btree", table.workspaceid),
	}
});

export const pharmacy_invoices = pgTable("pharmacy_invoices", {
	invoiceid: uuid("invoiceid").defaultRandom().primaryKey().notNull(),
	orderid: uuid("orderid").notNull().references(() => pharmacy_orders.orderid, { onDelete: "cascade" } ),
	patientid: uuid("patientid").references(() => patients.patientid, { onDelete: "set null" } ),
	insuranceid: uuid("insuranceid"),
	invoicenumber: text("invoicenumber").notNull(),
	status: text("status").default('DRAFT').notNull(),
	subtotal: numeric("subtotal", { precision: 12, scale:  2 }).default('0').notNull(),
	insurancecovered: numeric("insurancecovered", { precision: 12, scale:  2 }).default('0').notNull(),
	patientcopay: numeric("patientcopay", { precision: 12, scale:  2 }).default('0').notNull(),
	total: numeric("total", { precision: 12, scale:  2 }).default('0').notNull(),
	createdat: timestamp("createdat", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedat: timestamp("updatedat", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		order_idx: index("pharmacy_invoices_order_idx").using("btree", table.orderid),
		patient_idx: index("pharmacy_invoices_patient_idx").using("btree", table.patientid),
	}
});

export const pharmacy_stock_locations = pgTable("pharmacy_stock_locations", {
	locationid: uuid("locationid").defaultRandom().primaryKey().notNull(),
	workspaceid: uuid("workspaceid").notNull().references(() => workspaces.workspaceid, { onDelete: "cascade" } ),
	name: text("name").notNull(),
	type: text("type").default('shelf').notNull(),
	description: text("description"),
	createdat: timestamp("createdat", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		ws_idx: index("pharmacy_stock_locations_ws_idx").using("btree", table.workspaceid),
	}
});

export const users = pgTable("users", {
	userid: uuid("userid").defaultRandom().primaryKey().notNull(),
	name: text("name"),
	email: text("email").notNull(),
	image: text("image"),
	password: text("password"),
	theme: text("theme").default('system'),
	language: text("language").default('en'),
	permissions: jsonb("permissions").default([]),
	createdat: timestamp("createdat", { mode: 'string' }).defaultNow().notNull(),
	updatedat: timestamp("updatedat", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		users_email_unique: unique("users_email_unique").on(table.email),
	}
});

export const shop_orders = pgTable("shop_orders", {
	orderid: uuid("orderid").defaultRandom().primaryKey().notNull(),
	ordernumber: text("ordernumber").notNull(),
	deliveryaddress: text("deliveryaddress"),
	deliverytime: timestamp("deliverytime", { mode: 'string' }),
	clientname: text("clientname"),
	clientemail: text("clientemail"),
	clientphone: text("clientphone"),
	orderedby: uuid("orderedby").notNull().references(() => users.userid),
	approvedby: uuid("approvedby").references(() => users.userid),
	status: text("status").default('draft').notNull(),
	priority: text("priority").default('normal'),
	orderdate: timestamp("orderdate", { mode: 'string' }),
	approveddate: timestamp("approveddate", { mode: 'string' }),
	delivereddate: timestamp("delivereddate", { mode: 'string' }),
	totalcost: numeric("totalcost", { precision: 12, scale:  2 }),
	currency: text("currency").default('USD'),
	notes: text("notes"),
	internalnotes: text("internalnotes"),
	createdby: uuid("createdby").notNull().references(() => users.userid),
	createdat: text("createdat").notNull(),
	updatedby: uuid("updatedby").references(() => users.userid),
	updatedat: text("updatedat"),
	workspaceid: text("workspaceid").notNull(),
},
(table) => {
	return {
		order_date_idx: index("shop_orders_order_date_idx").using("btree", table.orderdate),
		order_number_idx: index("shop_orders_order_number_idx").using("btree", table.ordernumber),
		ordered_by_idx: index("shop_orders_ordered_by_idx").using("btree", table.orderedby),
		status_idx: index("shop_orders_status_idx").using("btree", table.status),
		workspace_idx: index("shop_orders_workspace_idx").using("btree", table.workspaceid),
		shop_orders_ordernumber_unique: unique("shop_orders_ordernumber_unique").on(table.ordernumber),
	}
});

export const test_results = pgTable("test_results", {
	resultid: uuid("resultid").defaultRandom().primaryKey().notNull(),
	sampleid: uuid("sampleid").notNull().references(() => accession_samples.sampleid, { onDelete: "cascade" } ),
	accessionsampleid: uuid("accessionsampleid").references(() => accession_samples.sampleid),
	worklistid: uuid("worklistid").references(() => worklists.worklistid),
	testcode: text("testcode").notNull(),
	testname: text("testname").notNull(),
	resultvalue: text("resultvalue").notNull(),
	resultnumeric: numeric("resultnumeric", { precision: 15, scale:  4 }),
	resulttext: text("resulttext"),
	resultcode: text("resultcode"),
	unit: text("unit"),
	referencemin: numeric("referencemin"),
	referencemax: numeric("referencemax"),
	referencerange: text("referencerange"),
	flag: text("flag").default('normal').notNull(),
	isabormal: boolean("isabormal").default(false).notNull(),
	iscritical: boolean("iscritical").default(false).notNull(),
	interpretation: text("interpretation"),
	previousvalue: text("previousvalue"),
	previousdate: timestamp("previousdate", { withTimezone: true, mode: 'string' }),
	analyzerresult: text("analyzerresult"),
	status: text("status").default('draft').notNull(),
	enteredby: uuid("enteredby").references(() => users.userid),
	entereddate: timestamp("entereddate", { withTimezone: true, mode: 'string' }),
	entrymethod: text("entrymethod"),
	instrumentid: text("instrumentid"),
	technicalvalidatedby: uuid("technicalvalidatedby").references(() => users.userid),
	technicalvalidateddate: timestamp("technicalvalidateddate", { withTimezone: true, mode: 'string' }),
	technicalvalidationcomment: text("technicalvalidationcomment"),
	medicalvalidatedby: uuid("medicalvalidatedby").references(() => users.userid),
	medicalvalidateddate: timestamp("medicalvalidateddate", { withTimezone: true, mode: 'string' }),
	medicalvalidationcomment: text("medicalvalidationcomment"),
	releasedby: uuid("releasedby").references(() => users.userid),
	releaseddate: timestamp("releaseddate", { withTimezone: true, mode: 'string' }),
	isqc: boolean("isqc").default(false).notNull(),
	qclevel: text("qclevel"),
	qcstatus: text("qcstatus"),
	validationcomment: text("validationcomment"),
	markedforrerun: boolean("markedforrerun").default(false).notNull(),
	rerunreason: text("rerunreason"),
	isrepeat: boolean("isrepeat").default(false).notNull(),
	repeatreason: text("repeatreason"),
	originalresultid: uuid("originalresultid"),
	comment: text("comment"),
	techniciannotes: text("techniciannotes"),
	alerts: text("alerts"),
	metadata: jsonb("metadata"),
	analyzeddate: timestamp("analyzeddate", { withTimezone: true, mode: 'string' }).notNull(),
	createdat: timestamp("createdat", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedat: timestamp("updatedat", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdby: uuid("createdby").references(() => users.userid),
	updatedby: uuid("updatedby").references(() => users.userid),
	workspaceid: text("workspaceid").notNull(),
},
(table) => {
	return {
		accessionsampleid_idx: index("test_results_accessionsampleid_idx").using("btree", table.accessionsampleid),
		entereddate_idx: index("test_results_entereddate_idx").using("btree", table.entereddate),
		flag_idx: index("test_results_flag_idx").using("btree", table.flag),
		iscritical_idx: index("test_results_iscritical_idx").using("btree", table.iscritical),
		markedforrerun_idx: index("test_results_markedforrerun_idx").using("btree", table.markedforrerun),
		sampleid_idx: index("test_results_sampleid_idx").using("btree", table.sampleid),
		status_idx: index("test_results_status_idx").using("btree", table.status),
		testcode_idx: index("test_results_testcode_idx").using("btree", table.testcode),
		worklistid_idx: index("test_results_worklistid_idx").using("btree", table.worklistid),
		workspaceid_idx: index("test_results_workspaceid_idx").using("btree", table.workspaceid),
	}
});

export const result_validation_history = pgTable("result_validation_history", {
	historyid: uuid("historyid").defaultRandom().primaryKey().notNull(),
	resultid: uuid("resultid").notNull().references(() => test_results.resultid, { onDelete: "cascade" } ),
	action: text("action").notNull(),
	previousstatus: text("previousstatus"),
	newstatus: text("newstatus").notNull(),
	previousvalue: text("previousvalue"),
	newvalue: text("newvalue"),
	validatedby: uuid("validatedby").notNull().references(() => users.userid),
	validateddate: timestamp("validateddate", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	validationlevel: text("validationlevel"),
	comment: text("comment"),
	rejectionreason: text("rejectionreason"),
	createdat: timestamp("createdat", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	workspaceid: text("workspaceid").notNull(),
},
(table) => {
	return {
		resultid_idx: index("result_validation_history_resultid_idx").using("btree", table.resultid),
		validatedby_idx: index("result_validation_history_validatedby_idx").using("btree", table.validatedby),
		validateddate_idx: index("result_validation_history_validateddate_idx").using("btree", table.validateddate),
	}
});

export const samples = pgTable("samples", {
	sampleid: uuid("sampleid").defaultRandom().primaryKey().notNull(),
	patientid: uuid("patientid").notNull().references(() => patients.patientid, { onDelete: "cascade" } ),
	workspaceid: text("workspaceid").notNull(),
	orderid: text("orderid").notNull(),
	sampletype: text("sampletype").notNull(),
	collectiondate: timestamp("collectiondate", { withTimezone: true, mode: 'string' }).notNull(),
	receiveddate: timestamp("receiveddate", { withTimezone: true, mode: 'string' }).notNull(),
	analyzer: text("analyzer"),
	testgroup: text("testgroup").notNull(),
	priority: text("priority").default('routine').notNull(),
	status: text("status").default('COLLECTED').notNull(),
	metadata: jsonb("metadata").default({}),
	createdat: timestamp("createdat", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedat: timestamp("updatedat", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		collectiondate_idx: index("samples_collectiondate_idx").using("btree", table.collectiondate),
		patientid_idx: index("samples_patientid_idx").using("btree", table.patientid),
		status_idx: index("samples_status_idx").using("btree", table.status),
		testgroup_idx: index("samples_testgroup_idx").using("btree", table.testgroup),
		workspaceid_idx: index("samples_workspaceid_idx").using("btree", table.workspaceid),
	}
});

export const sample_storage = pgTable("sample_storage", {
	storageid: uuid("storageid").defaultRandom().primaryKey().notNull(),
	sampleid: uuid("sampleid").notNull().references(() => accession_samples.sampleid, { onDelete: "cascade" } ),
	locationid: uuid("locationid").notNull().references(() => storage_locations.locationid),
	storagedate: timestamp("storagedate", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	expirydate: timestamp("expirydate", { withTimezone: true, mode: 'string' }).notNull(),
	retentiondays: integer("retentiondays").default(3).notNull(),
	status: text("status").default('stored').notNull(),
	retrieveddate: timestamp("retrieveddate", { withTimezone: true, mode: 'string' }),
	retrievedby: uuid("retrievedby").references(() => users.userid),
	retrievalreason: text("retrievalreason"),
	disposeddate: timestamp("disposeddate", { withTimezone: true, mode: 'string' }),
	disposedby: uuid("disposedby").references(() => users.userid),
	disposalmethod: text("disposalmethod"),
	disposalnotes: text("disposalnotes"),
	storagenotes: text("storagenotes"),
	storedby: uuid("storedby").notNull().references(() => users.userid),
	createdat: timestamp("createdat", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedat: timestamp("updatedat", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	workspaceid: text("workspaceid").notNull(),
},
(table) => {
	return {
		date_idx: index("sample_storage_date_idx").using("btree", table.storagedate),
		expiry_idx: index("sample_storage_expiry_idx").using("btree", table.expirydate),
		location_idx: index("sample_storage_location_idx").using("btree", table.locationid),
		sample_idx: index("sample_storage_sample_idx").using("btree", table.sampleid),
		status_idx: index("sample_storage_status_idx").using("btree", table.status),
		workspace_idx: index("sample_storage_workspace_idx").using("btree", table.workspaceid),
	}
});

export const suppliers = pgTable("suppliers", {
	supplierid: uuid("supplierid").defaultRandom().primaryKey().notNull(),
	name: text("name").notNull(),
	code: text("code").notNull(),
	description: text("description"),
	phonenumber: text("phonenumber"),
	phonenumber2: text("phonenumber2"),
	email: text("email"),
	email2: text("email2"),
	website: text("website"),
	addressline1: text("addressline1"),
	addressline2: text("addressline2"),
	city: text("city"),
	state: text("state"),
	postalcode: text("postalcode"),
	country: text("country"),
	taxid: text("taxid"),
	licensenumber: text("licensenumber"),
	establishedyear: integer("establishedyear"),
	contactperson: text("contactperson"),
	contacttitle: text("contacttitle"),
	contactphone: text("contactphone"),
	contactemail: text("contactemail"),
	category: text("category").notNull(),
	type: text("type").notNull(),
	specialization: text("specialization"),
	rating: numeric("rating", { precision: 3, scale:  2 }),
	ispreferred: boolean("ispreferred").default(false),
	isactive: boolean("isactive").default(true),
	paymentterms: text("paymentterms"),
	creditlimit: numeric("creditlimit", { precision: 12, scale:  2 }),
	currency: text("currency").default('USD'),
	supportphone: text("supportphone"),
	supportemail: text("supportemail"),
	technicalcontact: text("technicalcontact"),
	notes: text("notes"),
	contracturl: text("contracturl"),
	catalogurl: text("catalogurl"),
	createdby: uuid("createdby").notNull().references(() => users.userid),
	createdat: text("createdat").notNull(),
	updatedby: uuid("updatedby").references(() => users.userid),
	updatedat: text("updatedat"),
	workspaceid: text("workspaceid").notNull(),
},
(table) => {
	return {
		category_idx: index("suppliers_category_idx").using("btree", table.category),
		email_idx: index("suppliers_email_idx").using("btree", table.email),
		is_active_idx: index("suppliers_is_active_idx").using("btree", table.isactive),
		is_preferred_idx: index("suppliers_is_preferred_idx").using("btree", table.ispreferred),
		name_idx: index("suppliers_name_idx").using("btree", table.name),
		workspace_idx: index("suppliers_workspace_idx").using("btree", table.workspaceid),
		suppliers_code_unique: unique("suppliers_code_unique").on(table.code),
	}
});

export const storage_locations = pgTable("storage_locations", {
	locationid: uuid("locationid").defaultRandom().primaryKey().notNull(),
	name: text("name").notNull(),
	code: text("code").notNull(),
	description: text("description"),
	type: text("type").notNull(),
	category: text("category").notNull(),
	building: text("building"),
	room: text("room"),
	equipment: text("equipment"),
	section: text("section"),
	position: text("position"),
	capacity: integer("capacity"),
	currentcount: integer("currentcount").default(0),
	availableslots: integer("availableslots"),
	temperaturemin: numeric("temperaturemin", { precision: 5, scale:  2 }),
	temperaturemax: numeric("temperaturemax", { precision: 5, scale:  2 }),
	humiditymin: numeric("humiditymin", { precision: 5, scale:  2 }),
	humiditymax: numeric("humiditymax", { precision: 5, scale:  2 }),
	restrictedaccess: boolean("restrictedaccess").default(false),
	accessrequirements: text("accessrequirements"),
	status: text("status").default('active').notNull(),
	isavailable: boolean("isavailable").default(true),
	sortorder: integer("sortorder").default(0),
	parentlocationid: uuid("parentlocationid"),
	createdby: uuid("createdby").notNull().references(() => users.userid),
	createdat: text("createdat").notNull(),
	updatedby: uuid("updatedby").references(() => users.userid),
	updatedat: text("updatedat"),
	workspaceid: text("workspaceid").notNull(),
},
(table) => {
	return {
		code_idx: index("storage_locations_code_idx").using("btree", table.code),
		parent_idx: index("storage_locations_parent_idx").using("btree", table.parentlocationid),
		status_idx: index("storage_locations_status_idx").using("btree", table.status),
		type_idx: index("storage_locations_type_idx").using("btree", table.type),
		workspace_idx: index("storage_locations_workspace_idx").using("btree", table.workspaceid),
		storage_locations_code_unique: unique("storage_locations_code_unique").on(table.code),
	}
});

export const test_reference_audit_log = pgTable("test_reference_audit_log", {
	logid: uuid("logid").defaultRandom().primaryKey().notNull(),
	rangeid: uuid("rangeid").notNull(),
	workspaceid: uuid("workspaceid").notNull(),
	action: varchar("action", { length: 20 }).notNull(),
	userid: uuid("userid").notNull(),
	username: varchar("username", { length: 255 }),
	reason: text("reason"),
	changes: jsonb("changes"),
	snapshot: jsonb("snapshot"),
	createdat: timestamp("createdat", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		test_ref_audit_action_idx: index("test_ref_audit_action_idx").using("btree", table.action),
		test_ref_audit_createdat_idx: index("test_ref_audit_createdat_idx").using("btree", table.createdat),
		test_ref_audit_rangeid_idx: index("test_ref_audit_rangeid_idx").using("btree", table.rangeid),
		test_ref_audit_workspace_idx: index("test_ref_audit_workspace_idx").using("btree", table.workspaceid),
	}
});

export const test_reference_ranges = pgTable("test_reference_ranges", {
	rangeid: uuid("rangeid").defaultRandom().primaryKey().notNull(),
	workspaceid: uuid("workspaceid").notNull(),
	testcode: varchar("testcode", { length: 50 }).notNull(),
	testname: varchar("testname", { length: 255 }).notNull(),
	unit: varchar("unit", { length: 100 }).notNull(),
	agegroup: varchar("agegroup", { length: 20 }).default('ALL').notNull(),
	sex: varchar("sex", { length: 10 }).default('ANY').notNull(),
	referencemin: numeric("referencemin", { precision: 10, scale:  4 }),
	referencemax: numeric("referencemax", { precision: 10, scale:  4 }),
	referencetext: text("referencetext"),
	paniclow: numeric("paniclow", { precision: 10, scale:  4 }),
	panichigh: numeric("panichigh", { precision: 10, scale:  4 }),
	panictext: text("panictext"),
	labtype: varchar("labtype", { length: 100 }),
	grouptests: varchar("grouptests", { length: 255 }),
	sampletype: varchar("sampletype", { length: 100 }),
	containertype: varchar("containertype", { length: 100 }),
	bodysite: varchar("bodysite", { length: 100 }),
	clinicalindication: text("clinicalindication"),
	additionalinformation: text("additionalinformation"),
	notes: text("notes"),
	isactive: varchar("isactive", { length: 1 }).default('Y').notNull(),
	createdby: uuid("createdby").notNull(),
	createdat: timestamp("createdat", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedby: uuid("updatedby"),
	updatedat: timestamp("updatedat", { withTimezone: true, mode: 'string' }),
},
(table) => {
	return {
		test_ref_ranges_active_idx: index("test_ref_ranges_active_idx").using("btree", table.isactive),
		test_ref_ranges_agegroup_idx: index("test_ref_ranges_agegroup_idx").using("btree", table.agegroup),
		test_ref_ranges_bodysite_idx: index("test_ref_ranges_bodysite_idx").using("btree", table.bodysite),
		test_ref_ranges_labtype_idx: index("test_ref_ranges_labtype_idx").using("btree", table.labtype),
		test_ref_ranges_sampletype_idx: index("test_ref_ranges_sampletype_idx").using("btree", table.sampletype),
		test_ref_ranges_testcode_idx: index("test_ref_ranges_testcode_idx").using("btree", table.testcode),
		test_ref_ranges_workspace_idx: index("test_ref_ranges_workspace_idx").using("btree", table.workspaceid),
	}
});

export const accession_samples = pgTable("accession_samples", {
	sampleid: uuid("sampleid").defaultRandom().primaryKey().notNull(),
	samplenumber: text("samplenumber").notNull(),
	accessionnumber: text("accessionnumber"),
	sampletype: text("sampletype").notNull(),
	containertype: text("containertype"),
	volume: numeric("volume", { precision: 10, scale:  2 }),
	volumeunit: text("volumeunit"),
	collectiondate: timestamp("collectiondate", { withTimezone: true, mode: 'string' }).notNull(),
	collectorid: text("collectorid"),
	collectorname: text("collectorname"),
	orderid: uuid("orderid").references(() => lims_orders.orderid),
	openehrrequestid: text("openehrrequestid"),
	patientid: text("patientid"),
	ehrid: text("ehrid"),
	subjectidentifier: text("subjectidentifier"),
	barcode: text("barcode").notNull(),
	qrcode: text("qrcode").notNull(),
	openehrcompositionuid: text("openehrcompositionuid"),
	tests: jsonb("tests"),
	labcategory: text("labcategory"),
	currentstatus: text("currentstatus").default('RECEIVED').notNull(),
	currentlocation: text("currentlocation"),
	accessionedby: uuid("accessionedby").notNull().references(() => users.userid),
	accessionedat: timestamp("accessionedat", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	workspaceid: text("workspaceid").notNull(),
	createdat: timestamp("createdat", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedat: timestamp("updatedat", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	correctedat: timestamp("correctedat", { withTimezone: true, mode: 'string' }),
	correctedby: uuid("correctedby").references(() => users.userid),
	correctionreason: text("correctionreason"),
},
(table) => {
	return {
		barcode_idx: index("accession_samples_barcode_idx").using("btree", table.barcode),
		order_idx: index("accession_samples_order_idx").using("btree", table.orderid),
		patient_idx: index("accession_samples_patient_idx").using("btree", table.patientid),
		status_idx: index("accession_samples_status_idx").using("btree", table.currentstatus),
		workspace_idx: index("accession_samples_workspace_idx").using("btree", table.workspaceid),
		accession_samples_samplenumber_unique: unique("accession_samples_samplenumber_unique").on(table.samplenumber),
		accession_samples_barcode_unique: unique("accession_samples_barcode_unique").on(table.barcode),
	}
});

export const drugs = pgTable("drugs", {
	drugid: uuid("drugid").defaultRandom().primaryKey().notNull(),
	workspaceid: uuid("workspaceid").notNull().references(() => workspaces.workspaceid, { onDelete: "cascade" } ),
	name: text("name").notNull(),
	genericname: text("genericname"),
	atccode: text("atccode"),
	form: text("form").notNull(),
	strength: text("strength").notNull(),
	unit: text("unit").default('tablet').notNull(),
	barcode: text("barcode"),
	manufacturer: text("manufacturer"),
	nationalcode: text("nationalcode"),
	category: text("category"),
	description: text("description"),
	interaction: text("interaction"),
	warning: text("warning"),
	pregnancy: text("pregnancy"),
	sideeffect: text("sideeffect"),
	storagetype: text("storagetype"),
	indication: text("indication"),
	traffic: text("traffic"),
	notes: text("notes"),
	insuranceapproved: boolean("insuranceapproved").default(false),
	metadata: jsonb("metadata").default({}),
	requiresprescription: boolean("requiresprescription").default(true).notNull(),
	isactive: boolean("isactive").default(true).notNull(),
	createdat: timestamp("createdat", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedat: timestamp("updatedat", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		atc_idx: index("drugs_atc_idx").using("btree", table.atccode),
		barcode_idx: index("drugs_barcode_idx").using("btree", table.barcode),
		workspace_idx: index("drugs_workspace_idx").using("btree", table.workspaceid),
	}
});

export const shop_order_items = pgTable("shop_order_items", {
	itemid: uuid("itemid").defaultRandom().primaryKey().notNull(),
	orderid: uuid("orderid").notNull().references(() => shop_orders.orderid, { onDelete: "cascade" } ),
	itemname: text("itemname").notNull(),
	itemtype: text("itemtype"),
	size: text("size"),
	number: integer("number").default(1).notNull(),
	materialid: uuid("materialid"),
	equipmentid: uuid("equipmentid"),
	supplierid: uuid("supplierid"),
	unitprice: numeric("unitprice", { precision: 10, scale:  2 }),
	totalprice: numeric("totalprice", { precision: 12, scale:  2 }),
	notes: text("notes"),
	specifications: text("specifications"),
	sortorder: integer("sortorder").default(0),
	createdat: text("createdat").notNull(),
	updatedat: text("updatedat"),
},
(table) => {
	return {
		item_type_idx: index("shop_order_items_item_type_idx").using("btree", table.itemtype),
		order_id_idx: index("shop_order_items_order_id_idx").using("btree", table.orderid),
	}
});

export const worklists = pgTable("worklists", {
	worklistid: uuid("worklistid").defaultRandom().primaryKey().notNull(),
	worklistname: text("worklistname").notNull(),
	worklisttype: text("worklisttype").notNull(),
	department: text("department"),
	analyzer: text("analyzer"),
	priority: text("priority").default('routine').notNull(),
	status: text("status").default('pending').notNull(),
	createdby: uuid("createdby"),
	createdbyname: text("createdbyname"),
	assignedto: uuid("assignedto"),
	assignedtoname: text("assignedtoname"),
	description: text("description"),
	createdat: timestamp("createdat", { mode: 'string' }).defaultNow().notNull(),
	updatedat: timestamp("updatedat", { mode: 'string' }).defaultNow().notNull(),
	completedat: timestamp("completedat", { mode: 'string' }),
	workspaceid: uuid("workspaceid").notNull().references(() => workspaces.workspaceid, { onDelete: "cascade" } ),
},
(table) => {
	return {
		assigned_idx: index("worklists_assigned_idx").using("btree", table.assignedto),
		department_idx: index("worklists_department_idx").using("btree", table.department),
		status_idx: index("worklists_status_idx").using("btree", table.status),
		workspace_idx: index("worklists_workspace_idx").using("btree", table.workspaceid),
	}
});

export const validation_states = pgTable("validation_states", {
	stateid: uuid("stateid").defaultRandom().primaryKey().notNull(),
	sampleid: uuid("sampleid").notNull().references(() => accession_samples.sampleid, { onDelete: "cascade" } ),
	currentstate: text("currentstate").default('ANALYZED').notNull(),
	previousstate: text("previousstate"),
	validatedby: uuid("validatedby").references(() => users.userid),
	validateddate: timestamp("validateddate", { withTimezone: true, mode: 'string' }),
	releasedby: uuid("releasedby").references(() => users.userid),
	releaseddate: timestamp("releaseddate", { withTimezone: true, mode: 'string' }),
	rejectedby: uuid("rejectedby").references(() => users.userid),
	rejecteddate: timestamp("rejecteddate", { withTimezone: true, mode: 'string' }),
	rejectionreason: text("rejectionreason"),
	rerunrequestedby: uuid("rerunrequestedby").references(() => users.userid),
	rerunrequesteddate: timestamp("rerunrequesteddate", { withTimezone: true, mode: 'string' }),
	rerunreason: text("rerunreason"),
	notes: text("notes"),
	createdat: timestamp("createdat", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedat: timestamp("updatedat", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		currentstate_idx: index("validation_states_currentstate_idx").using("btree", table.currentstate),
		sampleid_idx: index("validation_states_sampleid_idx").using("btree", table.sampleid),
		validateddate_idx: index("validation_states_validateddate_idx").using("btree", table.validateddate),
		validation_states_sampleid_unique: unique("validation_states_sampleid_unique").on(table.sampleid),
	}
});

export const worklist_items = pgTable("worklist_items", {
	worklistitemid: uuid("worklistitemid").defaultRandom().primaryKey().notNull(),
	worklistid: uuid("worklistid").notNull().references(() => worklists.worklistid, { onDelete: "cascade" } ),
	orderid: text("orderid"),
	sampleid: text("sampleid"),
	testcode: text("testcode"),
	testname: text("testname"),
	status: text("status").default('pending').notNull(),
	position: text("position"),
	addedby: uuid("addedby").notNull(),
	addedbyname: text("addedbyname"),
	addedat: timestamp("addedat", { mode: 'string' }).defaultNow().notNull(),
	startedat: timestamp("startedat", { mode: 'string' }),
	completedat: timestamp("completedat", { mode: 'string' }),
	notes: text("notes"),
},
(table) => {
	return {
		order_idx: index("worklist_items_order_idx").using("btree", table.orderid),
		sample_idx: index("worklist_items_sample_idx").using("btree", table.sampleid),
		status_idx: index("worklist_items_status_idx").using("btree", table.status),
		worklist_idx: index("worklist_items_worklist_idx").using("btree", table.worklistid),
	}
});

export const workspaces = pgTable("workspaces", {
	workspaceid: uuid("workspaceid").defaultRandom().primaryKey().notNull(),
	name: text("name").notNull(),
	type: text("type").notNull(),
	description: text("description"),
	settings: jsonb("settings").default({}),
	createdat: timestamp("createdat", { mode: 'string' }).defaultNow().notNull(),
	updatedat: timestamp("updatedat", { mode: 'string' }).defaultNow().notNull(),
});

export const specialties = pgTable("specialties", {
	specialtyid: uuid("specialtyid").defaultRandom().primaryKey().notNull(),
	name: varchar("name", { length: 255 }).notNull(),
	description: text("description"),
	departmentid: uuid("departmentid"),
	code: varchar("code", { length: 50 }).notNull(),
	is_active: boolean("is_active").default(true),
	createdat: timestamp("createdat", { mode: 'string' }).defaultNow(),
	updatedat: timestamp("updatedat", { mode: 'string' }).defaultNow(),
},
(table) => {
	return {
		specialties_name_key: unique("specialties_name_key").on(table.name),
		specialties_code_key: unique("specialties_code_key").on(table.code),
	}
});

export const invoices = pgTable("invoices", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	invoice_number: varchar("invoice_number", { length: 50 }).notNull(),
	invoice_date: date("invoice_date").notNull(),
	patient_id: varchar("patient_id", { length: 50 }),
	patient_name: varchar("patient_name", { length: 255 }),
	patient_name_ar: text("patient_name_ar"),
	subtotal: numeric("subtotal", { precision: 12, scale:  2 }).default('0').notNull(),
	discount_percentage: numeric("discount_percentage", { precision: 5, scale:  2 }).default('0'),
	discount_amount: numeric("discount_amount", { precision: 12, scale:  2 }).default('0'),
	total_amount: numeric("total_amount", { precision: 12, scale:  2 }).default('0').notNull(),
	insurance_company_id: varchar("insurance_company_id", { length: 50 }),
	insurance_coverage_amount: numeric("insurance_coverage_amount", { precision: 12, scale:  2 }).default('0'),
	insurance_coverage_percentage: numeric("insurance_coverage_percentage", { precision: 5, scale:  2 }).default('0'),
	patient_responsibility: numeric("patient_responsibility", { precision: 12, scale:  2 }).default('0'),
	amount_paid: numeric("amount_paid", { precision: 12, scale:  2 }).default('0'),
	balance_due: numeric("balance_due", { precision: 12, scale:  2 }).default('0'),
	status: varchar("status", { length: 20 }).default('PENDING'),
	payment_method: varchar("payment_method", { length: 50 }),
	payment_date: date("payment_date"),
	notes: text("notes"),
	createdat: timestamp("createdat", { mode: 'string' }).defaultNow(),
	updatedat: timestamp("updatedat", { mode: 'string' }).defaultNow(),
},
(table) => {
	return {
		invoices_invoice_number_key: unique("invoices_invoice_number_key").on(table.invoice_number),
	}
});

export const invoice_items = pgTable("invoice_items", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	invoice_id: uuid("invoice_id").references(() => invoices.id, { onDelete: "cascade" } ),
	service_id: varchar("service_id", { length: 50 }),
	service_name: varchar("service_name", { length: 255 }),
	service_name_ar: text("service_name_ar"),
	quantity: numeric("quantity", { precision: 8, scale:  2 }).default('1').notNull(),
	unit_price: numeric("unit_price", { precision: 12, scale:  2 }).default('0').notNull(),
	total_price: numeric("total_price", { precision: 12, scale:  2 }).default('0').notNull(),
	createdat: timestamp("createdat", { mode: 'string' }).defaultNow(),
});

export const services = pgTable("services", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	code: varchar("code", { length: 20 }).notNull(),
	name: varchar("name", { length: 255 }).notNull(),
	name_ar: text("name_ar"),
	category: varchar("category", { length: 100 }).notNull(),
	subcategory: varchar("subcategory", { length: 100 }),
	description: text("description"),
	price_self_pay: numeric("price_self_pay", { precision: 12, scale:  2 }).default('0').notNull(),
	price_insurance: numeric("price_insurance", { precision: 12, scale:  2 }).default('0').notNull(),
	price_government: numeric("price_government", { precision: 12, scale:  2 }).default('0').notNull(),
	department_id: varchar("department_id", { length: 50 }),
	requires_appointment: boolean("requires_appointment").default(true),
	duration_minutes: integer("duration_minutes").default(30),
	active: boolean("active").default(true),
	createdat: timestamp("createdat", { mode: 'string' }).defaultNow(),
	updatedat: timestamp("updatedat", { mode: 'string' }).defaultNow(),
},
(table) => {
	return {
		services_code_key: unique("services_code_key").on(table.code),
	}
});

export const budget_periods = pgTable("budget_periods", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	period_name: varchar("period_name", { length: 255 }).notNull(),
	fiscal_year: integer("fiscal_year").notNull(),
	start_date: date("start_date").notNull(),
	end_date: date("end_date").notNull(),
	status: varchar("status", { length: 20 }).default('ACTIVE'),
	total_revenue_budget: numeric("total_revenue_budget", { precision: 15, scale:  2 }).default('0').notNull(),
	total_expense_budget: numeric("total_expense_budget", { precision: 15, scale:  2 }).default('0').notNull(),
	total_capital_budget: numeric("total_capital_budget", { precision: 15, scale:  2 }).default('0').notNull(),
	total_operational_budget: numeric("total_operational_budget", { precision: 15, scale:  2 }).default('0').notNull(),
	total_revenue_actual: numeric("total_revenue_actual", { precision: 15, scale:  2 }).default('0').notNull(),
	total_expense_actual: numeric("total_expense_actual", { precision: 15, scale:  2 }).default('0').notNull(),
	total_capital_actual: numeric("total_capital_actual", { precision: 15, scale:  2 }).default('0').notNull(),
	total_operational_actual: numeric("total_operational_actual", { precision: 15, scale:  2 }).default('0').notNull(),
	createdat: timestamp("createdat", { mode: 'string' }).defaultNow(),
	updatedat: timestamp("updatedat", { mode: 'string' }).defaultNow(),
});

export const budget_categories = pgTable("budget_categories", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	period_id: uuid("period_id").references(() => budget_periods.id, { onDelete: "cascade" } ),
	category_name: varchar("category_name", { length: 255 }).notNull(),
	category_type: varchar("category_type", { length: 20 }).notNull(),
	budgeted_amount: numeric("budgeted_amount", { precision: 15, scale:  2 }).default('0').notNull(),
	actual_amount: numeric("actual_amount", { precision: 15, scale:  2 }).default('0').notNull(),
	variance: numeric("variance", { precision: 15, scale:  2 }).default('0').notNull(),
	createdat: timestamp("createdat", { mode: 'string' }).defaultNow(),
	updatedat: timestamp("updatedat", { mode: 'string' }).defaultNow(),
});

export const departments = pgTable("departments", {
	departmentid: uuid("departmentid").defaultRandom().primaryKey().notNull(),
	name: varchar("name", { length: 255 }).notNull(),
	description: text("description"),
	createdat: timestamp("createdat", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedat: timestamp("updatedat", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const insurance_companies_basic = pgTable("insurance_companies_basic", {
	id: varchar("id", { length: 50 }).primaryKey().notNull(),
	company_code: varchar("company_code", { length: 20 }).notNull(),
	company_name: varchar("company_name", { length: 255 }).notNull(),
	company_name_ar: text("company_name_ar"),
	contact_person: varchar("contact_person", { length: 255 }),
	contact_phone: varchar("contact_phone", { length: 50 }),
	contact_email: varchar("contact_email", { length: 255 }),
	coverage_percentage: numeric("coverage_percentage", { precision: 5, scale:  2 }).default('100'),
	active: boolean("active").default(true),
	createdat: timestamp("createdat", { mode: 'string' }).defaultNow(),
	updatedat: timestamp("updatedat", { mode: 'string' }).defaultNow(),
},
(table) => {
	return {
		insurance_companies_basic_company_code_key: unique("insurance_companies_basic_company_code_key").on(table.company_code),
	}
});

export const insurance_companies = pgTable("insurance_companies", {
	company_id: varchar("company_id", { length: 50 }).primaryKey().notNull(),
	company_code: varchar("company_code", { length: 20 }).notNull(),
	company_name: varchar("company_name", { length: 255 }).notNull(),
	company_name_ar: text("company_name_ar"),
	contact_person: varchar("contact_person", { length: 255 }),
	contact_phone: varchar("contact_phone", { length: 50 }),
	contact_email: varchar("contact_email", { length: 255 }),
	address: text("address"),
	coverage_percentage: numeric("coverage_percentage", { precision: 5, scale:  2 }).default('100'),
	active: boolean("active").default(true),
	createdat: timestamp("createdat", { mode: 'string' }).defaultNow(),
	updatedat: timestamp("updatedat", { mode: 'string' }).defaultNow(),
},
(table) => {
	return {
		insurance_companies_company_code_key: unique("insurance_companies_company_code_key").on(table.company_code),
	}
});

export const invoice_returns = pgTable("invoice_returns", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organization_id: uuid("organization_id").default(sql`'00000000-0000-0000-0000-000000000001'`).notNull(),
	return_number: varchar("return_number", { length: 50 }).notNull(),
	return_date: date("return_date").notNull(),
	invoice_id: uuid("invoice_id"),
	invoice_number: varchar("invoice_number", { length: 50 }),
	patient_id: varchar("patient_id", { length: 50 }),
	patient_name: varchar("patient_name", { length: 255 }),
	patient_name_ar: text("patient_name_ar"),
	reason_ar: text("reason_ar"),
	reason_en: text("reason_en"),
	return_amount: numeric("return_amount", { precision: 15, scale:  2 }).notNull(),
	refund_method: varchar("refund_method", { length: 50 }),
	refund_date: date("refund_date"),
	refund_reference: varchar("refund_reference", { length: 100 }),
	status: varchar("status", { length: 50 }).default('PENDING'),
	approved_by: varchar("approved_by", { length: 255 }),
	approved_at: timestamp("approved_at", { mode: 'string' }),
	notes: text("notes"),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	created_by: varchar("created_by", { length: 255 }),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updated_by: varchar("updated_by", { length: 255 }),
	items: jsonb("items"),
},
(table) => {
	return {
		idx_invoice_returns_date: index("idx_invoice_returns_date").using("btree", table.return_date),
		idx_invoice_returns_invoice: index("idx_invoice_returns_invoice").using("btree", table.invoice_id),
		idx_invoice_returns_number: index("idx_invoice_returns_number").using("btree", table.return_number),
		idx_invoice_returns_patient: index("idx_invoice_returns_patient").using("btree", table.patient_id),
		idx_invoice_returns_status: index("idx_invoice_returns_status").using("btree", table.status),
		invoice_returns_return_number_key: unique("invoice_returns_return_number_key").on(table.return_number),
	}
});

export const leave_types = pgTable("leave_types", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organization_id: uuid("organization_id").default(sql`'00000000-0000-0000-0000-000000000001'`).notNull(),
	name: varchar("name", { length: 100 }).notNull(),
	name_ar: varchar("name_ar", { length: 100 }),
	code: varchar("code", { length: 20 }).notNull(),
	description: text("description"),
	description_ar: text("description_ar"),
	max_days_per_year: integer("max_days_per_year").default(0),
	is_paid: boolean("is_paid").default(true),
	requires_approval: boolean("requires_approval").default(true),
	min_notice_days: integer("min_notice_days").default(1),
	max_consecutive_days: integer("max_consecutive_days").default(365),
	accrual_frequency: varchar("accrual_frequency", { length: 20 }).default('YEARLY'),
	accrual_rate: numeric("accrual_rate", { precision: 5, scale:  2 }).default('1.00'),
	carry_forward_allowed: boolean("carry_forward_allowed").default(false),
	carry_forward_limit: integer("carry_forward_limit").default(0),
	color: varchar("color", { length: 7 }).default('#3B82F6'),
	icon: varchar("icon", { length: 50 }),
	sort_order: integer("sort_order").default(0),
	is_active: boolean("is_active").default(true),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	created_by: varchar("created_by", { length: 255 }),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updated_by: varchar("updated_by", { length: 255 }),
},
(table) => {
	return {
		idx_leave_types_active: index("idx_leave_types_active").using("btree", table.is_active),
		idx_leave_types_code: index("idx_leave_types_code").using("btree", table.code),
		idx_leave_types_org: index("idx_leave_types_org").using("btree", table.organization_id),
		leave_types_code_key: unique("leave_types_code_key").on(table.code),
	}
});

export const leave_requests = pgTable("leave_requests", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organization_id: uuid("organization_id").default(sql`'00000000-0000-0000-0000-000000000001'`).notNull(),
	employee_id: uuid("employee_id").notNull(),
	employee_name: varchar("employee_name", { length: 255 }),
	employee_number: varchar("employee_number", { length: 50 }),
	leave_type_id: uuid("leave_type_id").notNull().references(() => leave_types.id),
	leave_type_code: varchar("leave_type_code", { length: 20 }),
	start_date: date("start_date").notNull(),
	end_date: date("end_date").notNull(),
	return_date: date("return_date"),
	days_count: integer("days_count").notNull(),
	working_days_count: integer("working_days_count").default(0),
	reason: text("reason"),
	reason_ar: text("reason_ar"),
	emergency_contact: varchar("emergency_contact", { length: 20 }),
	emergency_reason: text("emergency_reason"),
	status: varchar("status", { length: 20 }).default('PENDING'),
	approved_by: uuid("approved_by"),
	approved_by_name: varchar("approved_by_name", { length: 255 }),
	approved_at: timestamp("approved_at", { mode: 'string' }),
	rejection_reason: text("rejection_reason"),
	replacement_employee: uuid("replacement_employee"),
	replacement_name: varchar("replacement_name", { length: 255 }),
	handover_notes: text("handover_notes"),
	attachments: jsonb("attachments"),
	request_source: varchar("request_source", { length: 20 }).default('WEB'),
	ip_address: inet("ip_address"),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	created_by: varchar("created_by", { length: 255 }),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updated_by: varchar("updated_by", { length: 255 }),
},
(table) => {
	return {
		idx_leave_requests_dates: index("idx_leave_requests_dates").using("btree", table.start_date, table.end_date),
		idx_leave_requests_employee: index("idx_leave_requests_employee").using("btree", table.employee_id),
		idx_leave_requests_org: index("idx_leave_requests_org").using("btree", table.organization_id),
		idx_leave_requests_status: index("idx_leave_requests_status").using("btree", table.status),
		idx_leave_requests_type: index("idx_leave_requests_type").using("btree", table.leave_type_id),
	}
});

export const leave_balance = pgTable("leave_balance", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organization_id: uuid("organization_id").default(sql`'00000000-0000-0000-0000-000000000001'`).notNull(),
	employee_id: uuid("employee_id").notNull(),
	leave_type_id: uuid("leave_type_id").notNull().references(() => leave_types.id),
	year: integer("year").notNull(),
	opening_balance: integer("opening_balance").default(0),
	accrued: integer("accrued").default(0),
	used: integer("used").default(0),
	carry_forwarded: integer("carry_forwarded").default(0),
	encashed: integer("encashed").default(0),
	forfeited: integer("forfeited").default(0),
	available_balance: integer("available_balance"),
	last_accrual_date: date("last_accrual_date"),
	last_used_date: date("last_used_date"),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
},
(table) => {
	return {
		idx_leave_balance_employee_type: index("idx_leave_balance_employee_type").using("btree", table.employee_id, table.leave_type_id),
		idx_leave_balance_employee_year: index("idx_leave_balance_employee_year").using("btree", table.employee_id, table.year),
		idx_leave_balance_org: index("idx_leave_balance_org").using("btree", table.organization_id),
		idx_leave_balance_year: index("idx_leave_balance_year").using("btree", table.year),
		leave_balance_employee_id_leave_type_id_year_key: unique("leave_balance_employee_id_leave_type_id_year_key").on(table.employee_id, table.leave_type_id, table.year),
	}
});

export const shifts = pgTable("shifts", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organization_id: uuid("organization_id").default(sql`'00000000-0000-0000-0000-000000000001'`).notNull(),
	name: varchar("name", { length: 100 }).notNull(),
	name_ar: varchar("name_ar", { length: 100 }),
	code: varchar("code", { length: 20 }).notNull(),
	description: text("description"),
	description_ar: text("description_ar"),
	start_time: time("start_time").notNull(),
	end_time: time("end_time").notNull(),
	break_minutes: integer("break_minutes").default(60),
	total_hours: numeric("total_hours", { precision: 5, scale:  2 }).notNull(),
	is_night_shift: boolean("is_night_shift").default(false),
	is_weekend_shift: boolean("is_weekend_shift").default(false),
	is_holiday_shift: boolean("is_holiday_shift").default(false),
	grace_period_minutes: integer("grace_period_minutes").default(15),
	overtime_start_after: integer("overtime_start_after").default(0),
	overtime_rate: numeric("overtime_rate", { precision: 3, scale:  2 }).default('1.50'),
	color: varchar("color", { length: 7 }).default('#3B82F6'),
	sort_order: integer("sort_order").default(0),
	is_active: boolean("is_active").default(true),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	created_by: varchar("created_by", { length: 255 }),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updated_by: varchar("updated_by", { length: 255 }),
},
(table) => {
	return {
		idx_shifts_active: index("idx_shifts_active").using("btree", table.is_active),
		idx_shifts_code: index("idx_shifts_code").using("btree", table.code),
		idx_shifts_org: index("idx_shifts_org").using("btree", table.organization_id),
		shifts_code_key: unique("shifts_code_key").on(table.code),
	}
});

export const shift_assignments = pgTable("shift_assignments", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organization_id: uuid("organization_id").default(sql`'00000000-0000-0000-0000-000000000001'`).notNull(),
	employee_id: uuid("employee_id").notNull(),
	shift_id: uuid("shift_id").notNull().references(() => shifts.id),
	start_date: date("start_date").notNull(),
	end_date: date("end_date"),
	is_active: boolean("is_active").default(true),
	is_temporary: boolean("is_temporary").default(false),
	rotation_pattern: varchar("rotation_pattern", { length: 50 }),
	approved_by: uuid("approved_by"),
	approved_at: timestamp("approved_at", { mode: 'string' }),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	created_by: varchar("created_by", { length: 255 }),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updated_by: varchar("updated_by", { length: 255 }),
},
(table) => {
	return {
		idx_shift_assignments_active: index("idx_shift_assignments_active").using("btree", table.is_active),
		idx_shift_assignments_dates: index("idx_shift_assignments_dates").using("btree", table.start_date, table.end_date),
		idx_shift_assignments_employee: index("idx_shift_assignments_employee").using("btree", table.employee_id),
		idx_shift_assignments_org: index("idx_shift_assignments_org").using("btree", table.organization_id),
		idx_shift_assignments_shift: index("idx_shift_assignments_shift").using("btree", table.shift_id),
	}
});

export const attendance_transactions = pgTable("attendance_transactions", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organization_id: uuid("organization_id").default(sql`'00000000-0000-0000-0000-000000000001'`).notNull(),
	employee_id: uuid("employee_id").notNull(),
	employee_name: varchar("employee_name", { length: 255 }),
	employee_number: varchar("employee_number", { length: 50 }),
	transaction_type: varchar("transaction_type", { length: 10 }).notNull(),
	timestamp: timestamp("timestamp", { withTimezone: true, mode: 'string' }).notNull(),
	device_type: varchar("device_type", { length: 50 }),
	device_id: varchar("device_id", { length: 100 }),
	location: varchar("location", { length: 100 }),
	is_valid: boolean("is_valid").default(true),
	validation_status: varchar("validation_status", { length: 20 }),
	validation_message: text("validation_message"),
	processed: boolean("processed").default(false),
	processed_at: timestamp("processed_at", { mode: 'string' }),
	daily_summary_id: uuid("daily_summary_id"),
	source: varchar("source", { length: 20 }).default('DEVICE'),
	ip_address: inet("ip_address"),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	created_by: varchar("created_by", { length: 255 }),
},
(table) => {
	return {
		idx_attendance_transactions_employee: index("idx_attendance_transactions_employee").using("btree", table.employee_id),
		idx_attendance_transactions_org: index("idx_attendance_transactions_org").using("btree", table.organization_id),
		idx_attendance_transactions_processed: index("idx_attendance_transactions_processed").using("btree", table.processed),
		idx_attendance_transactions_staff_id: index("idx_attendance_transactions_staff_id").using("btree", table.employee_id),
		idx_attendance_transactions_timestamp: index("idx_attendance_transactions_timestamp").using("btree", table.timestamp),
		idx_attendance_transactions_type: index("idx_attendance_transactions_type").using("btree", table.transaction_type),
	}
});

export const daily_attendance = pgTable("daily_attendance", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organization_id: uuid("organization_id").default(sql`'00000000-0000-0000-0000-000000000001'`).notNull(),
	employee_id: uuid("employee_id").notNull().references(() => staff.staffid, { onDelete: "cascade" } ),
	employee_name: varchar("employee_name", { length: 255 }),
	employee_number: varchar("employee_number", { length: 50 }),
	date: date("date").notNull(),
	first_in: timestamp("first_in", { withTimezone: true, mode: 'string' }),
	last_out: timestamp("last_out", { withTimezone: true, mode: 'string' }),
	total_hours: numeric("total_hours", { precision: 5, scale:  2 }).default('0'),
	regular_hours: numeric("regular_hours", { precision: 5, scale:  2 }).default('0'),
	overtime_hours: numeric("overtime_hours", { precision: 5, scale:  2 }).default('0'),
	shift_id: uuid("shift_id"),
	shift_name: varchar("shift_name", { length: 100 }),
	scheduled_start: time("scheduled_start"),
	scheduled_end: time("scheduled_end"),
	status: varchar("status", { length: 20 }).default('PRESENT'),
	attendance_score: numeric("attendance_score", { precision: 5, scale:  2 }).default('100.00'),
	late_arrival_minutes: integer("late_arrival_minutes").default(0),
	early_departure_min: integer("early_departure_min").default(0),
	break_minutes: integer("break_minutes").default(0),
	abnormal_hours: boolean("abnormal_hours").default(false),
	processed: boolean("processed").default(false),
	processed_at: timestamp("processed_at", { mode: 'string' }),
	processed_by: varchar("processed_by", { length: 255 }),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
},
(table) => {
	return {
		idx_daily_attendance_date: index("idx_daily_attendance_date").using("btree", table.date),
		idx_daily_attendance_employee: index("idx_daily_attendance_employee").using("btree", table.employee_id),
		idx_daily_attendance_employee_date: index("idx_daily_attendance_employee_date").using("btree", table.employee_id, table.date),
		idx_daily_attendance_org: index("idx_daily_attendance_org").using("btree", table.organization_id),
		idx_daily_attendance_staff_id: index("idx_daily_attendance_staff_id").using("btree", table.employee_id),
		idx_daily_attendance_status: index("idx_daily_attendance_status").using("btree", table.status),
		daily_attendance_employee_id_date_key: unique("daily_attendance_employee_id_date_key").on(table.employee_id, table.date),
	}
});

export const official_holidays = pgTable("official_holidays", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organization_id: uuid("organization_id").default(sql`'00000000-0000-0000-0000-000000000001'`).notNull(),
	name: varchar("name", { length: 100 }).notNull(),
	name_ar: varchar("name_ar", { length: 100 }),
	date: date("date").notNull(),
	is_recurring: boolean("is_recurring").default(false),
	is_paid_holiday: boolean("is_paid_holiday").default(true),
	is_optional: boolean("is_optional").default(false),
	affected_departments: jsonb("affected_departments"),
	affected_employees: jsonb("affected_employees"),
	color: varchar("color", { length: 7 }).default('#EF4444'),
	icon: varchar("icon", { length: 50 }),
	is_active: boolean("is_active").default(true),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	created_by: varchar("created_by", { length: 255 }),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updated_by: varchar("updated_by", { length: 255 }),
},
(table) => {
	return {
		idx_official_holidays_active: index("idx_official_holidays_active").using("btree", table.is_active),
		idx_official_holidays_date: index("idx_official_holidays_date").using("btree", table.date),
		idx_official_holidays_org: index("idx_official_holidays_org").using("btree", table.organization_id),
		idx_official_holidays_recurring: index("idx_official_holidays_recurring").using("btree", table.is_recurring),
	}
});

export const employees = pgTable("employees", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	employee_id: varchar("employee_id", { length: 20 }).notNull(),
	employee_number: varchar("employee_number", { length: 20 }).notNull(),
	first_name: varchar("first_name", { length: 100 }).notNull(),
	last_name: varchar("last_name", { length: 100 }).notNull(),
	full_name_arabic: varchar("full_name_arabic", { length: 200 }),
	date_of_birth: date("date_of_birth"),
	gender: varchar("gender", { length: 10 }),
	marital_status: varchar("marital_status", { length: 20 }),
	nationality: varchar("nationality", { length: 50 }),
	national_id: varchar("national_id", { length: 20 }),
	email_work: varchar("email_work", { length: 100 }),
	phone_mobile: varchar("phone_mobile", { length: 20 }),
	blood_type: varchar("blood_type", { length: 5 }),
	employment_type: varchar("employment_type", { length: 20 }),
	employee_category: varchar("employee_category", { length: 30 }),
	job_title: varchar("job_title", { length: 100 }),
	department_id: varchar("department_id", { length: 20 }),
	department_name: varchar("department_name", { length: 100 }),
	reporting_to: varchar("reporting_to", { length: 20 }),
	grade_id: varchar("grade_id", { length: 10 }),
	date_of_hire: date("date_of_hire"),
	employment_status: varchar("employment_status", { length: 20 }),
	basic_salary: numeric("basic_salary", { precision: 12, scale:  2 }),
	photo_url: varchar("photo_url", { length: 200 }),
	organization_id: uuid("organization_id").default(sql`'00000000-0000-0000-0000-000000000001'`),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	created_by: uuid("created_by"),
	updated_by: uuid("updated_by"),
},
(table) => {
	return {
		idx_employees_department_id: index("idx_employees_department_id").using("btree", table.department_id),
		idx_employees_employee_id: index("idx_employees_employee_id").using("btree", table.employee_id),
		idx_employees_organization_id: index("idx_employees_organization_id").using("btree", table.organization_id),
		idx_employment_status: index("idx_employment_status").using("btree", table.employment_status),
		employees_reporting_to_fkey: foreignKey({
			columns: [table.reporting_to],
			foreignColumns: [table.employee_id],
			name: "employees_reporting_to_fkey"
		}),
		employees_employee_id_key: unique("employees_employee_id_key").on(table.employee_id),
		employees_employee_number_key: unique("employees_employee_number_key").on(table.employee_number),
	}
});

export const employee_schedules = pgTable("employee_schedules", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organization_id: uuid("organization_id").default(sql`'00000000-0000-0000-0000-000000000001'`).notNull(),
	employee_id: uuid("employee_id").notNull().references(() => staff.staffid, { onDelete: "cascade" } ),
	shift_id: uuid("shift_id").notNull().references(() => shifts.id),
	effective_date: date("effective_date").notNull(),
	end_date: date("end_date"),
	schedule_type: varchar("schedule_type", { length: 20 }).default('REGULAR'),
	rotation_pattern: varchar("rotation_pattern", { length: 50 }),
	is_active: boolean("is_active").default(true),
	status: varchar("status", { length: 20 }).default('ACTIVE'),
	approved_by: uuid("approved_by"),
	approved_by_name: varchar("approved_by_name", { length: 255 }),
	approved_at: timestamp("approved_at", { withTimezone: true, mode: 'string' }),
	notes: text("notes"),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	created_by: uuid("created_by"),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updated_by: uuid("updated_by"),
},
(table) => {
	return {
		idx_employee_schedules_dates: index("idx_employee_schedules_dates").using("btree", table.effective_date, table.end_date),
		idx_employee_schedules_employee_id: index("idx_employee_schedules_employee_id").using("btree", table.employee_id),
		idx_employee_schedules_organization_id: index("idx_employee_schedules_organization_id").using("btree", table.organization_id),
		idx_employee_schedules_shift_id: index("idx_employee_schedules_shift_id").using("btree", table.shift_id),
		idx_employee_schedules_status: index("idx_employee_schedules_status").using("btree", table.status),
	}
});

export const daily_schedule_details = pgTable("daily_schedule_details", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organization_id: uuid("organization_id").default(sql`'00000000-0000-0000-0000-000000000001'`).notNull(),
	schedule_id: uuid("schedule_id").notNull().references(() => employee_schedules.id, { onDelete: "cascade" } ),
	day_of_week: integer("day_of_week").notNull(),
	start_time: time("start_time").notNull(),
	end_time: time("end_time").notNull(),
	lunch_start: time("lunch_start"),
	lunch_end: time("lunch_end"),
	lunch_duration_mins: integer("lunch_duration_mins").default(60),
	morning_break_start: time("morning_break_start"),
	morning_break_end: time("morning_break_end"),
	afternoon_break_start: time("afternoon_break_start"),
	afternoon_break_end: time("afternoon_break_end"),
	break_duration_mins: integer("break_duration_mins").default(15),
	total_work_hours: numeric("total_work_hours", { precision: 4, scale:  2 }),
	net_work_hours: numeric("net_work_hours", { precision: 4, scale:  2 }),
	flexible_start: boolean("flexible_start").default(false),
	flexible_end: boolean("flexible_end").default(false),
	core_hours_start: time("core_hours_start"),
	core_hours_end: time("core_hours_end"),
	is_active: boolean("is_active").default(true),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
},
(table) => {
	return {
		idx_daily_schedule_details_day_of_week: index("idx_daily_schedule_details_day_of_week").using("btree", table.day_of_week),
		idx_daily_schedule_details_schedule_id: index("idx_daily_schedule_details_schedule_id").using("btree", table.schedule_id),
	}
});

export const schedule_exceptions = pgTable("schedule_exceptions", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organization_id: uuid("organization_id").default(sql`'00000000-0000-0000-0000-000000000001'`).notNull(),
	employee_id: uuid("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" } ),
	exception_date: date("exception_date").notNull(),
	exception_type: varchar("exception_type", { length: 30 }).notNull(),
	modified_start_time: time("modified_start_time"),
	modified_end_time: time("modified_end_time"),
	modified_shift_id: uuid("modified_shift_id").references(() => shifts.id),
	reason: text("reason"),
	is_paid: boolean("is_paid").default(true),
	status: varchar("status", { length: 20 }).default('PENDING'),
	approved_by: uuid("approved_by"),
	approved_by_name: varchar("approved_by_name", { length: 255 }),
	approved_at: timestamp("approved_at", { withTimezone: true, mode: 'string' }),
	rejection_reason: text("rejection_reason"),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	created_by: uuid("created_by"),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updated_by: uuid("updated_by"),
},
(table) => {
	return {
		idx_schedule_exceptions_date: index("idx_schedule_exceptions_date").using("btree", table.exception_date),
		idx_schedule_exceptions_employee_id: index("idx_schedule_exceptions_employee_id").using("btree", table.employee_id),
		idx_schedule_exceptions_status: index("idx_schedule_exceptions_status").using("btree", table.status),
	}
});

export const employee_rotation_assignments = pgTable("employee_rotation_assignments", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organization_id: uuid("organization_id").default(sql`'00000000-0000-0000-0000-000000000001'`).notNull(),
	employee_id: uuid("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" } ),
	rotation_id: uuid("rotation_id").notNull().references(() => shift_rotations.id),
	start_date: date("start_date").notNull(),
	end_date: date("end_date"),
	current_cycle_day: integer("current_cycle_day").default(1),
	last_rotation_date: date("last_rotation_date"),
	is_active: boolean("is_active").default(true),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	created_by: uuid("created_by"),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updated_by: uuid("updated_by"),
},
(table) => {
	return {
		idx_employee_rotation_assignments_dates: index("idx_employee_rotation_assignments_dates").using("btree", table.start_date, table.end_date),
		idx_employee_rotation_assignments_employee_id: index("idx_employee_rotation_assignments_employee_id").using("btree", table.employee_id),
		idx_employee_rotation_assignments_rotation_id: index("idx_employee_rotation_assignments_rotation_id").using("btree", table.rotation_id),
	}
});

export const shift_rotations = pgTable("shift_rotations", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organization_id: uuid("organization_id").default(sql`'00000000-0000-0000-0000-000000000001'`).notNull(),
	rotation_name: varchar("rotation_name", { length: 100 }).notNull(),
	rotation_code: varchar("rotation_code", { length: 20 }).notNull(),
	description: text("description"),
	rotation_pattern: jsonb("rotation_pattern").notNull(),
	cycle_length_days: integer("cycle_length_days").notNull(),
	is_active: boolean("is_active").default(true),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	created_by: uuid("created_by"),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updated_by: uuid("updated_by"),
},
(table) => {
	return {
		idx_shift_rotations_active: index("idx_shift_rotations_active").using("btree", table.is_active),
		idx_shift_rotations_code: index("idx_shift_rotations_code").using("btree", table.rotation_code),
		shift_rotations_rotation_code_key: unique("shift_rotations_rotation_code_key").on(table.rotation_code),
	}
});

export const leave_policy_rules = pgTable("leave_policy_rules", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organization_id: uuid("organization_id").default(sql`'00000000-0000-0000-0000-000000000001'`).notNull(),
	leave_type_id: uuid("leave_type_id").references(() => leave_types.id),
	department_id: uuid("department_id"),
	role_type: varchar("role_type", { length: 50 }),
	min_service_months: integer("min_service_months").default(0),
	probation_period_months: integer("probation_period_months").default(3),
	blackout_periods: jsonb("blackout_periods").default([]),
	blackout_reason: text("blackout_reason"),
	max_concurrent_requests: integer("max_concurrent_requests").default(1),
	max_dept_concurrent: integer("max_dept_concurrent"),
	min_staff_required: integer("min_staff_required"),
	requires_replacement: boolean("requires_replacement").default(false),
	replacement_same_role: boolean("replacement_same_role").default(true),
	critical_periods: jsonb("critical_periods").default({}),
	critical_period_approval: varchar("critical_period_approval", { length: 50 }),
	override_notice_days: integer("override_notice_days"),
	requires_manager_approval: boolean("requires_manager_approval").default(true),
	requires_hr_approval: boolean("requires_hr_approval").default(false),
	requires_director_approval: boolean("requires_director_approval").default(false),
	auto_approve_threshold: integer("auto_approve_threshold"),
	is_active: boolean("is_active").default(true),
	priority: integer("priority").default(0),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	created_by: varchar("created_by", { length: 255 }),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updated_by: varchar("updated_by", { length: 255 }),
},
(table) => {
	return {
		idx_policy_rules_active: index("idx_policy_rules_active").using("btree", table.is_active),
		idx_policy_rules_department: index("idx_policy_rules_department").using("btree", table.department_id),
		idx_policy_rules_leave_type: index("idx_policy_rules_leave_type").using("btree", table.leave_type_id),
		idx_policy_rules_org: index("idx_policy_rules_org").using("btree", table.organization_id),
	}
});

export const leave_audit_log = pgTable("leave_audit_log", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organization_id: uuid("organization_id").default(sql`'00000000-0000-0000-0000-000000000001'`).notNull(),
	leave_request_id: uuid("leave_request_id").notNull().references(() => leave_requests.id, { onDelete: "cascade" } ),
	action: varchar("action", { length: 50 }).notNull(),
	old_status: varchar("old_status", { length: 20 }),
	new_status: varchar("new_status", { length: 20 }),
	performed_by: uuid("performed_by"),
	performed_by_name: varchar("performed_by_name", { length: 255 }),
	performed_by_role: varchar("performed_by_role", { length: 50 }),
	field_changed: varchar("field_changed", { length: 100 }),
	old_value: text("old_value"),
	new_value: text("new_value"),
	reason: text("reason"),
	notes: text("notes"),
	ip_address: inet("ip_address"),
	user_agent: text("user_agent"),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
},
(table) => {
	return {
		idx_audit_log_action: index("idx_audit_log_action").using("btree", table.action),
		idx_audit_log_created: index("idx_audit_log_created").using("btree", table.created_at),
		idx_audit_log_org: index("idx_audit_log_org").using("btree", table.organization_id),
		idx_audit_log_performed_by: index("idx_audit_log_performed_by").using("btree", table.performed_by),
		idx_audit_log_request: index("idx_audit_log_request").using("btree", table.leave_request_id),
	}
});

export const department_staffing_rules = pgTable("department_staffing_rules", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organization_id: uuid("organization_id").default(sql`'00000000-0000-0000-0000-000000000001'`).notNull(),
	department_id: uuid("department_id"),
	department_name: varchar("department_name", { length: 255 }),
	role_type: varchar("role_type", { length: 50 }),
	minimum_staff: integer("minimum_staff").default(1).notNull(),
	critical_minimum: integer("critical_minimum").default(1).notNull(),
	optimal_staff: integer("optimal_staff"),
	applies_to_shifts: jsonb("applies_to_shifts").default([]),
	applies_to_days: varchar("applies_to_days", { length: 50 }).array(),
	weekend_minimum: integer("weekend_minimum"),
	holiday_minimum: integer("holiday_minimum"),
	enforce_strict: boolean("enforce_strict").default(true),
	allow_manager_override: boolean("allow_manager_override").default(false),
	is_active: boolean("is_active").default(true),
	effective_from: date("effective_from"),
	effective_to: date("effective_to"),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	created_by: varchar("created_by", { length: 255 }),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updated_by: varchar("updated_by", { length: 255 }),
},
(table) => {
	return {
		idx_staffing_rules_active: index("idx_staffing_rules_active").using("btree", table.is_active),
		idx_staffing_rules_department: index("idx_staffing_rules_department").using("btree", table.department_id),
		idx_staffing_rules_org: index("idx_staffing_rules_org").using("btree", table.organization_id),
		idx_staffing_rules_role: index("idx_staffing_rules_role").using("btree", table.role_type),
	}
});

export const leave_approval_workflow = pgTable("leave_approval_workflow", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organization_id: uuid("organization_id").default(sql`'00000000-0000-0000-0000-000000000001'`).notNull(),
	leave_type_id: uuid("leave_type_id").references(() => leave_types.id),
	department_id: uuid("department_id"),
	days_threshold: integer("days_threshold").default(0),
	approval_level: integer("approval_level").default(1).notNull(),
	level_name: varchar("level_name", { length: 100 }),
	approver_role: varchar("approver_role", { length: 50 }),
	approver_id: uuid("approver_id"),
	approver_name: varchar("approver_name", { length: 255 }),
	is_required: boolean("is_required").default(true),
	can_delegate: boolean("can_delegate").default(false),
	auto_approve_conditions: jsonb("auto_approve_conditions"),
	max_approval_hours: integer("max_approval_hours").default(48),
	escalation_hours: integer("escalation_hours").default(72),
	escalate_to_role: varchar("escalate_to_role", { length: 50 }),
	sequence_order: integer("sequence_order").default(1),
	parallel_approval: boolean("parallel_approval").default(false),
	is_active: boolean("is_active").default(true),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	created_by: varchar("created_by", { length: 255 }),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updated_by: varchar("updated_by", { length: 255 }),
},
(table) => {
	return {
		idx_approval_workflow_active: index("idx_approval_workflow_active").using("btree", table.is_active),
		idx_approval_workflow_department: index("idx_approval_workflow_department").using("btree", table.department_id),
		idx_approval_workflow_leave_type: index("idx_approval_workflow_leave_type").using("btree", table.leave_type_id),
		idx_approval_workflow_level: index("idx_approval_workflow_level").using("btree", table.approval_level),
		idx_approval_workflow_org: index("idx_approval_workflow_org").using("btree", table.organization_id),
	}
});

export const leave_request_approvals = pgTable("leave_request_approvals", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organization_id: uuid("organization_id").default(sql`'00000000-0000-0000-0000-000000000001'`).notNull(),
	leave_request_id: uuid("leave_request_id").notNull().references(() => leave_requests.id, { onDelete: "cascade" } ),
	approval_level: integer("approval_level").notNull(),
	level_name: varchar("level_name", { length: 100 }),
	approver_id: uuid("approver_id"),
	approver_name: varchar("approver_name", { length: 255 }),
	approver_role: varchar("approver_role", { length: 50 }),
	status: varchar("status", { length: 20 }).default('PENDING'),
	decision_date: timestamp("decision_date", { withTimezone: true, mode: 'string' }),
	comments: text("comments"),
	rejection_reason: text("rejection_reason"),
	delegated_to: uuid("delegated_to"),
	delegated_to_name: varchar("delegated_to_name", { length: 255 }),
	delegated_at: timestamp("delegated_at", { withTimezone: true, mode: 'string' }),
	assigned_at: timestamp("assigned_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	due_date: timestamp("due_date", { withTimezone: true, mode: 'string' }),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
},
(table) => {
	return {
		idx_request_approvals_approver: index("idx_request_approvals_approver").using("btree", table.approver_id),
		idx_request_approvals_level: index("idx_request_approvals_level").using("btree", table.approval_level),
		idx_request_approvals_org: index("idx_request_approvals_org").using("btree", table.organization_id),
		idx_request_approvals_request: index("idx_request_approvals_request").using("btree", table.leave_request_id),
		idx_request_approvals_status: index("idx_request_approvals_status").using("btree", table.status),
	}
});

export const notifications = pgTable("notifications", {
	notificationid: uuid("notificationid").defaultRandom().primaryKey().notNull(),
	organization_id: uuid("organization_id").default(sql`'00000000-0000-0000-0000-000000000001'`).notNull(),
	recipient_id: uuid("recipient_id").notNull(),
	recipient_name: varchar("recipient_name", { length: 255 }),
	recipient_email: varchar("recipient_email", { length: 255 }),
	recipient_phone: varchar("recipient_phone", { length: 50 }),
	notification_type: varchar("notification_type", { length: 50 }).notNull(),
	category: varchar("category", { length: 50 }).default('LEAVE'),
	priority: varchar("priority", { length: 20 }).default('NORMAL'),
	title: varchar("title", { length: 255 }).notNull(),
	message: text("message").notNull(),
	action_url: varchar("action_url", { length: 500 }),
	action_label: varchar("action_label", { length: 100 }),
	related_entity_type: varchar("related_entity_type", { length: 50 }),
	related_entity_id: uuid("related_entity_id"),
	send_email: boolean("send_email").default(true),
	send_sms: boolean("send_sms").default(false),
	send_in_app: boolean("send_in_app").default(true),
	email_sent: boolean("email_sent").default(false),
	email_sent_at: timestamp("email_sent_at", { withTimezone: true, mode: 'string' }),
	email_error: text("email_error"),
	sms_sent: boolean("sms_sent").default(false),
	sms_sent_at: timestamp("sms_sent_at", { withTimezone: true, mode: 'string' }),
	sms_error: text("sms_error"),
	is_read: boolean("is_read").default(false),
	read_at: timestamp("read_at", { withTimezone: true, mode: 'string' }),
	metadata: jsonb("metadata").default({}),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	expires_at: timestamp("expires_at", { withTimezone: true, mode: 'string' }),
},
(table) => {
	return {
		idx_notifications_category: index("idx_notifications_category").using("btree", table.category),
		idx_notifications_created: index("idx_notifications_created").using("btree", table.created_at),
		idx_notifications_entity: index("idx_notifications_entity").using("btree", table.related_entity_type, table.related_entity_id),
		idx_notifications_org: index("idx_notifications_org").using("btree", table.organization_id),
		idx_notifications_read: index("idx_notifications_read").using("btree", table.is_read),
		idx_notifications_recipient: index("idx_notifications_recipient").using("btree", table.recipient_id),
		idx_notifications_type: index("idx_notifications_type").using("btree", table.notification_type),
	}
});

export const notification_templates = pgTable("notification_templates", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organization_id: uuid("organization_id").default(sql`'00000000-0000-0000-0000-000000000001'`).notNull(),
	template_code: varchar("template_code", { length: 100 }).notNull(),
	template_name: varchar("template_name", { length: 255 }).notNull(),
	category: varchar("category", { length: 50 }).default('LEAVE'),
	email_subject: varchar("email_subject", { length: 255 }),
	email_body: text("email_body"),
	sms_body: varchar("sms_body", { length: 500 }),
	in_app_title: varchar("in_app_title", { length: 255 }),
	in_app_message: text("in_app_message"),
	variables: jsonb("variables").default([]),
	default_send_email: boolean("default_send_email").default(true),
	default_send_sms: boolean("default_send_sms").default(false),
	default_send_in_app: boolean("default_send_in_app").default(true),
	default_priority: varchar("default_priority", { length: 20 }).default('NORMAL'),
	is_active: boolean("is_active").default(true),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
},
(table) => {
	return {
		idx_templates_active: index("idx_templates_active").using("btree", table.is_active),
		idx_templates_category: index("idx_templates_category").using("btree", table.category),
		idx_templates_code: index("idx_templates_code").using("btree", table.template_code),
		idx_templates_org: index("idx_templates_org").using("btree", table.organization_id),
		notification_templates_template_code_key: unique("notification_templates_template_code_key").on(table.template_code),
	}
});

export const notification_preferences = pgTable("notification_preferences", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organization_id: uuid("organization_id").default(sql`'00000000-0000-0000-0000-000000000001'`).notNull(),
	user_id: uuid("user_id").notNull(),
	category: varchar("category", { length: 50 }).notNull(),
	notification_type: varchar("notification_type", { length: 50 }),
	enable_email: boolean("enable_email").default(true),
	enable_sms: boolean("enable_sms").default(false),
	enable_in_app: boolean("enable_in_app").default(true),
	digest_mode: boolean("digest_mode").default(false),
	digest_time: time("digest_time").default('09:00:00'),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
},
(table) => {
	return {
		idx_preferences_category: index("idx_preferences_category").using("btree", table.category),
		idx_preferences_org: index("idx_preferences_org").using("btree", table.organization_id),
		idx_preferences_user: index("idx_preferences_user").using("btree", table.user_id),
		notification_preferences_user_id_category_notification_type_key: unique("notification_preferences_user_id_category_notification_type_key").on(table.user_id, table.category, table.notification_type),
	}
});

export const workspaceusers = pgTable("workspaceusers", {
	workspaceid: uuid("workspaceid").notNull().references(() => workspaces.workspaceid, { onDelete: "cascade" } ),
	userid: uuid("userid").notNull().references(() => users.userid, { onDelete: "cascade" } ),
	role: text("role").notNull(),
	createdat: timestamp("createdat", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		workspaceusers_workspaceid_userid_pk: primaryKey({ columns: [table.workspaceid, table.userid], name: "workspaceusers_workspaceid_userid_pk"}),
	}
});