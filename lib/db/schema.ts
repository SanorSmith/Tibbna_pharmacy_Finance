import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  jsonb,
  integer,
  decimal,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const drugFormEnum = pgEnum("drug_form", [
  "tablet", "capsule", "inhaler", "syrup", "injection",
  "cream", "drops", "suppository", "patch", "powder",
]);

export const storageTypeEnum = pgEnum("storage_type", [
  "room_temperature", "refrigerated", "frozen",
  "protect_from_light", "protect_from_moisture",
]);

export const trafficEnum = pgEnum("traffic", [
  "otc", "rx", "controlled", "narcotic",
]);

export const pregnancyCategoryEnum = pgEnum("pregnancy_category", [
  "A", "B", "C", "D", "X", "N",
]);

export const itemTypeEnum = pgEnum("item_type", [
  "drug", "supply", "consumable", "reagent", "asset", "radiology",
]);

export const inventoryCategoryEnum = pgEnum("inventory_category", [
  "pharmacy", "lab", "hospital", "radiology",
]);

export const storeTypeEnum = pgEnum("store_type", [
  "main", "sub",
]);

export const requisitionStatusEnum = pgEnum("requisition_status", [
  "pending", "approved", "rejected", "fulfilled", "partial",
]);

// ─── Workspaces ───────────────────────────────────────────────────────────────

export const workspaces = pgTable("workspaces", {
  workspaceid: uuid("workspaceid").primaryKey().defaultRandom(),
  name:        text("name").notNull(),
  isactive:    boolean("isactive").default(true),
  createdat:   timestamp("createdat", { withTimezone: true }).defaultNow(),
  updatedat:   timestamp("updatedat", { withTimezone: true }).defaultNow(),
});

// ─── Users ────────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  userid:      uuid("userid").primaryKey().defaultRandom(),
  name:        text("name"),
  email:       text("email").notNull().unique(),
  image:       text("image"),
  password:    text("password"),
  theme:       text("theme").default("system"),
  language:    text("language").default("en"),
  permissions: jsonb("permissions").default("[]"),
  createdat:   timestamp("createdat", { withTimezone: true }).defaultNow().notNull(),
  updatedat:   timestamp("updatedat", { withTimezone: true }).defaultNow().notNull(),
});

export const userSessions = pgTable("usersessions", {
  sessionid:    uuid("sessionid").primaryKey().defaultRandom(),
  userid:       uuid("userid").notNull().references(() => users.userid, { onDelete: "cascade" }),
  sessiontoken: text("sessiontoken").notNull().unique(),
  deviceinfo:   text("deviceinfo"),
  ipaddress:    text("ipaddress"),
  useragent:    text("useragent"),
  createdat:    timestamp("createdat", { withTimezone: true }).defaultNow().notNull(),
  lastactive:   timestamp("lastactive", { withTimezone: true }).defaultNow().notNull(),
  expiresat:    timestamp("expiresat", { withTimezone: true }).notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UserSession = typeof userSessions.$inferSelect;
export type NewUserSession = typeof userSessions.$inferInsert;

// ─── Drug Categories ──────────────────────────────────────────────────────────

export const drugCategories = pgTable("drug_categories", {
  categoryid:  uuid("categoryid").primaryKey().defaultRandom(),
  workspaceid: uuid("workspaceid").references(() => workspaces.workspaceid),
  name:        text("name").notNull(),
  atcgroup:    text("atcgroup"),
  description: text("description"),
  createdat:   timestamp("createdat", { withTimezone: true }).defaultNow(),
});

// ─── Drugs ────────────────────────────────────────────────────────────────────

export const drugs = pgTable("drugs", {
  drugid:               uuid("drugid").primaryKey().defaultRandom(),
  workspaceid:          uuid("workspaceid").references(() => workspaces.workspaceid).notNull(),
  categoryid:           uuid("category").references(() => drugCategories.categoryid),
  name:                 text("name").notNull(),
  genericname:          text("genericname"),
  atccode:              text("atccode"),
  nationalcode:         text("nationalcode"),
  barcode:              text("barcode"),
  form:                 drugFormEnum("form"),
  strength:             text("strength"),
  unit:                 text("unit"),
  manufacturer:         text("manufacturer"),
  description:          text("description"),
  indication:           text("indication"),
  interaction:          text("interaction"),
  warning:              text("warning"),
  sideeffect:           text("sideeffect"),
  pregnancy:            pregnancyCategoryEnum("pregnancy"),
  storagetype:          storageTypeEnum("storagetype"),
  traffic:              trafficEnum("traffic"),
  notes:                text("notes"),
  requiresprescription: boolean("requiresprescription").default(false),
  insuranceapproved:    boolean("insuranceapproved").default(false),
  isactive:             boolean("isactive").default(true),
  metadata:             jsonb("metadata").default({}),
  createdat:            timestamp("createdat", { withTimezone: true }).defaultNow(),
  updatedat:            timestamp("updatedat", { withTimezone: true }).defaultNow(),
});

// ─── Drug Inventory ───────────────────────────────────────────────────────────

export const drugInventory = pgTable("drug_inventory", {
  inventoryid:  uuid("inventoryid").primaryKey().defaultRandom(),
  drugid:       uuid("drugid").references(() => drugs.drugid).notNull(),
  workspaceid:  uuid("workspaceid").references(() => workspaces.workspaceid).notNull(),
  quantity:     integer("quantity").notNull().default(0),
  minquantity:  integer("minquantity").default(0),
  maxquantity:  integer("maxquantity"),
  unitcost:     decimal("unitcost", { precision: 10, scale: 2 }),
  sellingprice: decimal("sellingprice", { precision: 10, scale: 2 }),
  expirydate:   timestamp("expirydate", { withTimezone: true }),
  batchnumber:  text("batchnumber"),
  location:     text("location"),
  createdat:    timestamp("createdat", { withTimezone: true }).defaultNow(),
  updatedat:    timestamp("updatedat", { withTimezone: true }).defaultNow(),
});

// ─── Suppliers ────────────────────────────────────────────────────────────────

export const suppliers = pgTable("suppliers", {
  supplierid:  uuid("supplierid").primaryKey().defaultRandom(),
  workspaceid: uuid("workspaceid").references(() => workspaces.workspaceid),
  name:        text("name").notNull(),
  contactname: text("contactname"),
  phone:       text("phone"),
  email:       text("email"),
  address:     text("address"),
  isactive:    boolean("isactive").default(true),
  createdat:   timestamp("createdat", { withTimezone: true }).defaultNow(),
});

// ─── Drug Suppliers ───────────────────────────────────────────────────────────

export const drugSuppliers = pgTable("drug_suppliers", {
  id:           uuid("id").primaryKey().defaultRandom(),
  drugid:       uuid("drugid").references(() => drugs.drugid).notNull(),
  supplierid:   uuid("supplierid").references(() => suppliers.supplierid).notNull(),
  suppliercode: text("suppliercode"),
  leadtimedays: integer("leadtimedays"),
  ispreferred:  boolean("ispreferred").default(false),
  createdat:    timestamp("createdat", { withTimezone: true }).defaultNow(),
});

// ─── Drug Interactions ────────────────────────────────────────────────────────

export const drugInteractions = pgTable("drug_interactions", {
  interactionid:  uuid("interactionid").primaryKey().defaultRandom(),
  drugid_a:       uuid("drugid_a").references(() => drugs.drugid).notNull(),
  drugid_b:       uuid("drugid_b").references(() => drugs.drugid).notNull(),
  severity:       text("severity"),
  description:    text("description"),
  clinicaleffect: text("clinicaleffect"),
  createdat:      timestamp("createdat", { withTimezone: true }).defaultNow(),
});

// ─── Drug Alternatives ────────────────────────────────────────────────────────

export const drugAlternatives = pgTable("drug_alternatives", {
  id:            uuid("id").primaryKey().defaultRandom(),
  drugid:        uuid("drugid").references(() => drugs.drugid).notNull(),
  alternativeid: uuid("alternativeid").references(() => drugs.drugid).notNull(),
  reason:        text("reason"),
  createdat:     timestamp("createdat", { withTimezone: true }).defaultNow(),
});

// ─── Dispensing Log ───────────────────────────────────────────────────────────

export const dispensingLog = pgTable("dispensing_log", {
  logid:           uuid("logid").primaryKey().defaultRandom(),
  drugid:          uuid("drugid").references(() => drugs.drugid).notNull(),
  workspaceid:     uuid("workspaceid").references(() => workspaces.workspaceid).notNull(),
  quantity:        integer("quantity").notNull(),
  patientref:      text("patientref"),
  prescriptionref: text("prescriptionref"),
  dispensedby:     uuid("dispensedby"),
  notes:           text("notes"),
  createdat:       timestamp("createdat", { withTimezone: true }).defaultNow(),
});

// ─── Warehouses ───────────────────────────────────────────────────────────────

export const warehouseTypeEnum = pgEnum("warehouse_type", [
  "hospital", "pharmacy", "lab", "radiology",
]);

export const warehouses = pgTable("warehouses", {
  id:              uuid("id").primaryKey().defaultRandom(),
  name:            text("name").notNull(),
  warehousetype:   warehouseTypeEnum("warehouse_type").default("hospital"),
  location:        text("location"),
  manager:         text("manager"),
  description:     text("description"),
  isactive:        boolean("is_active").default(true),
  createdat:       timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedat:       timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ─── Warehouse Sections ───────────────────────────────────────────────────────

export const warehouseSections = pgTable("warehouse_sections", {
  id:                    uuid("id").primaryKey().defaultRandom(),
  warehouseid:           uuid("warehouse_id").references(() => warehouses.id).notNull(),
  sectionname:           text("section_name").notNull(),
  sectiontype:           text("section_type"),
  binlocation:           text("bin_location"),
  shelf:                 text("shelf"),
  description:           text("description"),
  temperaturecontrolled: boolean("temperature_controlled").default(false),
  createdat:             timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ─── Warehouse Stock ──────────────────────────────────────────────────────────

export const warehouseStock = pgTable("warehouse_stock", {
  id:          uuid("id").primaryKey().defaultRandom(),
  warehouseid: uuid("warehouse_id").references(() => warehouses.id).notNull(),
  sectionid:   uuid("section_id").references(() => warehouseSections.id),
  drugid:      uuid("drug_id").references(() => drugs.drugid).notNull(),
  quantity:    integer("quantity").notNull().default(0),
  createdat:   timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ─── Items (Universal Item Master) ───────────────────────────────────────────

export const items = pgTable("items", {
  id:                uuid("id").primaryKey().defaultRandom(),
  workspaceid:       uuid("workspace_id").references(() => workspaces.workspaceid).notNull(),
  itemcode:          text("item_code").notNull(),
  name:              text("name").notNull(),
  genericname:       text("generic_name"),
  description:       text("description"),
  itemtype:          itemTypeEnum("item_type").notNull(),
  inventorycategory: inventoryCategoryEnum("inventory_category").notNull(),
  uom:               text("uom").notNull(),
  secondaryuom:      text("secondary_uom"),
  tertiaryuom:       text("tertiary_uom"),
  minlevel:          integer("min_level").default(0),
  maxlevel:          integer("max_level"),
  reorderlevel:      integer("reorder_level").default(0),
  batchtracking:     boolean("batch_tracking").default(true),
  serialtracking:    boolean("serial_tracking").default(false),
  expirytracking:    boolean("expiry_tracking").default(true),
  controlled:        boolean("controlled").default(false),
  hazardous:         boolean("hazardous").default(false),
  manufacturer:      text("manufacturer"),
  supplierid:        uuid("supplier_id").references(() => suppliers.supplierid),
  barcode:           text("barcode"),
  drugid:            uuid("drug_id").references(() => drugs.drugid),
  // supply/consumable specific
  singleuse:         boolean("single_use").default(false),
  sterile:           boolean("sterile").default(false),
  // asset specific
  assetcategory:     text("asset_category"),
  serialnumber:      text("serial_number"),
  // radiology specific
  contrasttype:      text("contrast_type"),
  // lab specific
  analyzercompat:    text("analyzer_compat"),
  criticalreagent:   boolean("critical_reagent").default(false),
  isactive:          boolean("is_active").default(true),
  metadata:          jsonb("metadata").default({}),
  createdat:         timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedat:         timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ─── Unit Conversions ─────────────────────────────────────────────────────────

export const unitConversions = pgTable("unit_conversions", {
  id:        uuid("id").primaryKey().defaultRandom(),
  itemid:    uuid("item_id").references(() => items.id).notNull(),
  fromuom:   text("from_uom").notNull(),
  touom:     text("to_uom").notNull(),
  factor:    decimal("factor", { precision: 10, scale: 4 }).notNull(),
  createdat: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ─── Item Batches ─────────────────────────────────────────────────────────────

export const itemBatches = pgTable("item_batches", {
  id:              uuid("id").primaryKey().defaultRandom(),
  itemid:          uuid("item_id").references(() => items.id).notNull(),   // ← items, not drugs
  warehouseid:     uuid("warehouse_id").references(() => warehouses.id),
  batchnumber:     text("batch_number").notNull(),
  quantity:        integer("quantity").notNull().default(0),
  unitcost:        decimal("unit_cost", { precision: 10, scale: 2 }),
  sellingprice:    decimal("selling_price", { precision: 10, scale: 2 }),
  expirydate:      timestamp("expiry_date", { withTimezone: true }),
  manufacturedate: timestamp("manufacture_date", { withTimezone: true }),
  isquarantined:   boolean("is_quarantined").default(false),
  createdat:       timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ─── Inventory Stock ──────────────────────────────────────────────────────────

export const inventoryStock = pgTable("inventory_stock", {
  id:               uuid("id").primaryKey().defaultRandom(),
  itemid:           uuid("item_id").references(() => items.id).notNull(),
  warehouseid:      uuid("warehouse_id").references(() => warehouses.id).notNull(),
  batchid:          uuid("batch_id").references(() => itemBatches.id),
  quantity:         integer("quantity").notNull().default(0),
  reservedquantity: integer("reserved_quantity").notNull().default(0),
  lastupdated:      timestamp("last_updated", { withTimezone: true }).defaultNow(),
});

// ─── Stock Transactions ───────────────────────────────────────────────────────

export const stockTransactions = pgTable("stock_transactions", {
  id:              uuid("id").primaryKey().defaultRandom(),
  itemid:          uuid("item_id").references(() => items.id).notNull(),
  warehouseid:     uuid("warehouse_id").references(() => warehouses.id).notNull(),
  batchid:         uuid("batch_id").references(() => itemBatches.id),
  transactiontype: text("transaction_type").notNull(),
  quantity:        integer("quantity").notNull(),
  referencetype:   text("reference_type"),
  referenceid:     text("reference_id"),
  patientref:      text("patient_ref"),
  notes:           text("notes"),
  createdby:       text("created_by"),
  createdat:       timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ─── Stock Transfers ──────────────────────────────────────────────────────────

export const stockTransfers = pgTable("stock_transfers", {
  id:                     uuid("id").primaryKey().defaultRandom(),
  itemid:                 uuid("item_id").references(() => items.id).notNull(),
  batchid:                uuid("batch_id").references(() => itemBatches.id),
  sourcewarehouseid:      uuid("source_warehouse_id").references(() => warehouses.id).notNull(),
  destinationwarehouseid: uuid("destination_warehouse_id").references(() => warehouses.id).notNull(),
  quantity:               integer("quantity").notNull(),
  reason:                 text("reason"),
  createdby:              text("created_by"),
  createdat:              timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ─── Stock Adjustments ────────────────────────────────────────────────────────

export const stockAdjustments = pgTable("stock_adjustments", {
  id:                 uuid("id").primaryKey().defaultRandom(),
  itemid:             uuid("item_id").references(() => items.id).notNull(),
  warehouseid:        uuid("warehouse_id").references(() => warehouses.id).notNull(),
  batchid:            uuid("batch_id").references(() => itemBatches.id),
  adjustmentquantity: integer("adjustment_quantity").notNull(),
  reason:             text("reason"),
  createdby:          text("created_by"),
  createdat:          timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ─── Stores (Department Sub-stores) ──────────────────────────────────────────

export const stores = pgTable("stores", {
  id:          uuid("id").primaryKey().defaultRandom(),
  workspaceid: uuid("workspace_id").references(() => workspaces.workspaceid).notNull(),
  name:        text("name").notNull(),
  storetype:   storeTypeEnum("store_type").notNull().default("sub"),
  department:  text("department"),
  warehouseid: uuid("warehouse_id").references(() => warehouses.id),
  manager:     text("manager"),
  location:    text("location"),
  description: text("description"),
  isactive:    boolean("is_active").default(true),
  createdat:   timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedat:   timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ─── Store Stock ──────────────────────────────────────────────────────────────

export const storeStock = pgTable("store_stock", {
  id:               uuid("id").primaryKey().defaultRandom(),
  storeid:          uuid("store_id").references(() => stores.id).notNull(),
  itemid:           uuid("item_id").references(() => items.id).notNull(),
  batchid:          uuid("batch_id").references(() => itemBatches.id),
  quantity:         integer("quantity").notNull().default(0),
  reservedquantity: integer("reserved_quantity").notNull().default(0),
  lastupdated:      timestamp("last_updated", { withTimezone: true }).defaultNow(),
});

// ─── Store Transactions ───────────────────────────────────────────────────────

export const storeTransactions = pgTable("store_transactions", {
  id:              uuid("id").primaryKey().defaultRandom(),
  storeid:         uuid("store_id").references(() => stores.id).notNull(),
  itemid:          uuid("item_id").references(() => items.id).notNull(),
  batchid:         uuid("batch_id").references(() => itemBatches.id),
  transactiontype: text("transaction_type").notNull(),
  quantity:        integer("quantity").notNull(),
  referencetype:   text("reference_type"),
  referenceid:     text("reference_id"),
  patientref:      text("patient_ref"),
  prescriptionref: text("prescription_ref"),
  notes:           text("notes"),
  createdby:       text("created_by"),
  createdat:       timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ─── Store Requisitions ───────────────────────────────────────────────────────

export const storeRequisitions = pgTable("store_requisitions", {
  id:           uuid("id").primaryKey().defaultRandom(),
  storeid:      uuid("store_id").references(() => stores.id).notNull(),
  warehouseid:  uuid("warehouse_id").references(() => warehouses.id).notNull(),
  itemid:       uuid("item_id").references(() => items.id).notNull(),
  requestedqty: integer("requested_qty").notNull(),
  approvedqty:  integer("approved_qty"),
  fulfilledqty: integer("fulfilled_qty").default(0),
  status:       requisitionStatusEnum("status").default("pending"),
  requestedby:  text("requested_by"),
  approvedby:   text("approved_by"),
  notes:        text("notes"),
  createdat:    timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedat:    timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ─── Controlled Drug Log ──────────────────────────────────────────────────────

export const controlledDrugLog = pgTable("controlled_drug_log", {
  id:              uuid("id").primaryKey().defaultRandom(),
  storeid:         uuid("store_id").references(() => stores.id).notNull(),
  itemid:          uuid("item_id").references(() => items.id).notNull(),
  batchid:         uuid("batch_id").references(() => itemBatches.id),
  actiontype:      text("action_type").notNull(),   // DISPENSE, RETURN, DESTROY, AUDIT
  quantity:        integer("quantity").notNull(),
  patientref:      text("patient_ref"),
  prescriptionref: text("prescription_ref"),
  dispensedby:     text("dispensed_by"),
  witnessedby:     text("witnessed_by"),
  notes:           text("notes"),
  createdat:       timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ─── Batch Quarantine ─────────────────────────────────────────────────────────

export const batchQuarantine = pgTable("batch_quarantine", {
  id:            uuid("id").primaryKey().defaultRandom(),
  batchid:       uuid("batch_id").references(() => itemBatches.id).notNull(),
  itemid:        uuid("item_id").references(() => items.id),
  reason:        text("reason").notNull(),
  quarantinedby: text("quarantined_by"),
  resolvedby:    text("resolved_by"),
  resolvedat:    timestamp("resolved_at", { withTimezone: true }),
  isresolved:    boolean("is_resolved").default(false),
  notes:         text("notes"),
  createdat:     timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ─── Reagent Analyzer Assignments ────────────────────────────────────────────

export const reagentAssignments = pgTable("reagent_assignments", {
  id:                 uuid("id").primaryKey().defaultRandom(),
  itemid:             uuid("item_id").references(() => items.id).notNull(),
  analyzername:       text("analyzer_name").notNull(),
  testtype:           text("test_type"),
  consumptionpertest: decimal("consumption_per_test", { precision: 10, scale: 4 }),
  criticalflag:       boolean("critical_flag").default(false),
  isactive:           boolean("is_active").default(true),
  notes:              text("notes"),
  createdat:          timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedat:          timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ─── Lab Test Consumption Log ─────────────────────────────────────────────────

export const labConsumptionLog = pgTable("lab_consumption_log", {
  id:               uuid("id").primaryKey().defaultRandom(),
  assignmentid:     uuid("assignment_id").references(() => reagentAssignments.id).notNull(),
  itemid:           uuid("item_id").references(() => items.id).notNull(),
  storeid:          uuid("store_id").references(() => stores.id),
  batchid:          uuid("batch_id").references(() => itemBatches.id),
  testcount:        integer("test_count").notNull().default(1),
  quantityconsumed: decimal("quantity_consumed", { precision: 10, scale: 4 }).notNull(),
  patientref:       text("patient_ref"),
  sampleref:        text("sample_ref"),
  runnotes:         text("run_notes"),
  createdby:        text("created_by"),
  createdat:        timestamp("created_at", { withTimezone: true }).defaultNow(),
});


// ─── Radiology Procedures ─────────────────────────────────────────────────────

export const radiologyProcedures = pgTable("radiology_procedures", {
  id:            uuid("id").primaryKey().defaultRandom(),
  storeid:       uuid("store_id").references(() => stores.id).notNull(),
  itemid:        uuid("item_id").references(() => items.id).notNull(),
  batchid:       uuid("batch_id").references(() => itemBatches.id),
  procedurename: text("procedure_name").notNull(),
  proceduretype: text("procedure_type"),
  patientref:    text("patient_ref"),
  quantityused:  decimal("quantity_used", { precision: 10, scale: 4 }).notNull(),
  performedby:   text("performed_by"),
  notes:         text("notes"),
  createdat:     timestamp("created_at", { withTimezone: true }).defaultNow(),
});


// ─── Phase 2: Procurement ─────────────────────────────────────────────────────

export const prStatusEnum = pgEnum("pr_status", [
  "draft", "pending", "approved", "rejected", "converted",
]);

export const poStatusEnum = pgEnum("po_status", [
  "draft", "approved", "sent", "partial", "complete", "cancelled",
]);

export const grnStatusEnum = pgEnum("grn_status", [
  "draft", "confirmed", "posted",
]);

export const vendors = pgTable("vendors", {
  id:           uuid("id").primaryKey().defaultRandom(),
  name:         text("name").notNull(),
  code:         text("code"),
  contactname:  text("contactname"),
  phone:        text("phone"),
  email:        text("email"),
  address:      text("address"),
  country:      text("country"),
  paymentterms: integer("paymentterms").default(30),
  currency:     text("currency").default("USD"),
  taxnumber:    text("taxnumber"),
  rating:       integer("rating").default(0),
  isactive:     boolean("isactive").default(true),
  notes:        text("notes"),
  createdat:    timestamp("createdat", { withTimezone: true }).defaultNow(),
  updatedat:    timestamp("updatedat", { withTimezone: true }).defaultNow(),
});

export const vendorContracts = pgTable("vendor_contracts", {
  id:           uuid("id").primaryKey().defaultRandom(),
  vendorid:     uuid("vendorid").references(() => vendors.id),
  itemid:       uuid("itemid").references(() => items.id),
  unitprice:    decimal("unitprice", { precision: 10, scale: 4 }).notNull(),
  currency:     text("currency").default("USD"),
  minorderqty:  integer("minorderqty").default(1),
  leadtimedays: integer("leadtimedays").default(7),
  validfrom:    timestamp("validfrom", { withTimezone: true }),
  validto:      timestamp("validto", { withTimezone: true }),
  isactive:     boolean("isactive").default(true),
  createdat:    timestamp("createdat", { withTimezone: true }).defaultNow(),
});

export const purchaseRequisitions = pgTable("purchase_requisitions", {
  id:           uuid("id").primaryKey().defaultRandom(),
  prnumber:     text("prnumber").notNull(),
  warehouseid:  uuid("warehouseid").references(() => warehouses.id),
  requestedby:  text("requestedby"),
  approvedby:   text("approvedby"),
  status:       prStatusEnum("status").default("draft"),
  priority:     text("priority").default("normal"),
  requireddate: timestamp("requiredddate", { withTimezone: true }),
  notes:        text("notes"),
  createdat:    timestamp("createdat", { withTimezone: true }).defaultNow(),
  updatedat:    timestamp("updatedat", { withTimezone: true }).defaultNow(),
});

export const purchaseRequisitionItems = pgTable("purchase_requisition_items", {
  id:             uuid("id").primaryKey().defaultRandom(),
  prid:           uuid("prid").references(() => purchaseRequisitions.id),
  itemid:         uuid("itemid").references(() => items.id),
  requestedqty:   integer("requestedqty").notNull(),
  approvedqty:    integer("approvedqty"),
  estimatedprice: decimal("estimatedprice", { precision: 10, scale: 4 }),
  notes:          text("notes"),
  createdat:      timestamp("createdat", { withTimezone: true }).defaultNow(),
});

export const purchaseOrders = pgTable("purchase_orders", {
  id:              uuid("id").primaryKey().defaultRandom(),
  ponumber:        text("ponumber").notNull(),
  vendorid:        uuid("vendorid").references(() => vendors.id),
  prid:            uuid("prid").references(() => purchaseRequisitions.id),
  warehouseid:     uuid("warehouseid").references(() => warehouses.id),
  status:          poStatusEnum("status").default("draft"),
  orderdate:       timestamp("orderdate", { withTimezone: true }).defaultNow(),
  expecteddate:    timestamp("expecteddate", { withTimezone: true }),
  totalamount:     decimal("totalamount", { precision: 12, scale: 4 }).default("0"),
  currency:        text("currency").default("USD"),
  paymentterms:    integer("paymentterms").default(30),
  shippingaddress: text("shippingaddress"),
  notes:           text("notes"),
  approvedby:      text("approvedby"),
  sentby:          text("sentby"),
  createdat:       timestamp("createdat", { withTimezone: true }).defaultNow(),
  updatedat:       timestamp("updatedat", { withTimezone: true }).defaultNow(),
});

export const purchaseOrderItems = pgTable("purchase_order_items", {
  id:          uuid("id").primaryKey().defaultRandom(),
  poid:        uuid("poid").references(() => purchaseOrders.id),
  itemid:      uuid("itemid").references(() => items.id),
  orderedqty:  integer("orderedqty").notNull(),
  receivedqty: integer("receivedqty").default(0),
  unitprice:   decimal("unitprice", { precision: 10, scale: 4 }).notNull(),
  totalamount: decimal("totalamount", { precision: 12, scale: 4 }),
  createdat:   timestamp("createdat", { withTimezone: true }).defaultNow(),
});

export const goodsReceiptNotes = pgTable("goods_receipt_notes", {
  id:            uuid("id").primaryKey().defaultRandom(),
  grnnumber:     text("grnnumber").notNull(),
  poid:          uuid("poid").references(() => purchaseOrders.id),
  vendorid:      uuid("vendorid").references(() => vendors.id),
  warehouseid:   uuid("warehouseid").references(() => warehouses.id),
  status:        grnStatusEnum("status").default("draft"),
  receiptdate:   timestamp("receiptdate", { withTimezone: true }).defaultNow(),
  invoicenumber: text("invoicenumber"),
  invoicedate:   timestamp("invoicedate", { withTimezone: true }),
  receivedby:    text("receivedby"),
  notes:         text("notes"),
  createdat:     timestamp("createdat", { withTimezone: true }).defaultNow(),
  updatedat:     timestamp("updatedat", { withTimezone: true }).defaultNow(),
});

export const grnItems = pgTable("grn_items", {
  id:              uuid("id").primaryKey().defaultRandom(),
  grnid:           uuid("grnid").references(() => goodsReceiptNotes.id),
  itemid:          uuid("itemid").references(() => items.id),
  poitemid:        uuid("poitemid").references(() => purchaseOrderItems.id),
  orderedqty:      integer("orderedqty"),
  receivedqty:     integer("receivedqty").notNull(),
  rejectedqty:     integer("rejectedqty").default(0),
  unitprice:       decimal("unitprice", { precision: 10, scale: 4 }),
  batchnumber:     text("batchnumber"),
  expirydate:      timestamp("expirydate", { withTimezone: true }),
  manufacturedate: timestamp("manufacturedate", { withTimezone: true }),
  notes:           text("notes"),
  createdat:       timestamp("createdat", { withTimezone: true }).defaultNow(),
});
// ─── Relations ────────────────────────────────────────────────────────────────

export const drugsRelations = relations(drugs, ({ one, many }) => ({
  workspace:       one(workspaces, { fields: [drugs.workspaceid], references: [workspaces.workspaceid] }),
  category:        one(drugCategories, { fields: [drugs.categoryid], references: [drugCategories.categoryid] }),
  inventory:       many(drugInventory),
  suppliers:       many(drugSuppliers),
  interactionsAsA: many(drugInteractions, { relationName: "drug_a" }),
  interactionsAsB: many(drugInteractions, { relationName: "drug_b" }),
  alternatives:    many(drugAlternatives, { relationName: "drug" }),
  dispensingLog:   many(dispensingLog),
  warehouseStock:  many(warehouseStock),
  items:           many(items),
}));

export const drugInventoryRelations = relations(drugInventory, ({ one }) => ({
  drug:      one(drugs, { fields: [drugInventory.drugid], references: [drugs.drugid] }),
  workspace: one(workspaces, { fields: [drugInventory.workspaceid], references: [workspaces.workspaceid] }),
}));

export const drugSuppliersRelations = relations(drugSuppliers, ({ one }) => ({
  drug:     one(drugs, { fields: [drugSuppliers.drugid], references: [drugs.drugid] }),
  supplier: one(suppliers, { fields: [drugSuppliers.supplierid], references: [suppliers.supplierid] }),
}));

export const drugInteractionsRelations = relations(drugInteractions, ({ one }) => ({
  drugA: one(drugs, { fields: [drugInteractions.drugid_a], references: [drugs.drugid], relationName: "drug_a" }),
  drugB: one(drugs, { fields: [drugInteractions.drugid_b], references: [drugs.drugid], relationName: "drug_b" }),
}));

export const dispensingLogRelations = relations(dispensingLog, ({ one }) => ({
  drug:      one(drugs, { fields: [dispensingLog.drugid], references: [drugs.drugid] }),
  workspace: one(workspaces, { fields: [dispensingLog.workspaceid], references: [workspaces.workspaceid] }),
}));

export const warehousesRelations = relations(warehouses, ({ many }) => ({
  sections: many(warehouseSections),
  stock:    many(warehouseStock),
  stores:   many(stores),
}));

export const warehouseSectionsRelations = relations(warehouseSections, ({ one, many }) => ({
  warehouse: one(warehouses, { fields: [warehouseSections.warehouseid], references: [warehouses.id] }),
  stock:     many(warehouseStock),
}));

export const warehouseStockRelations = relations(warehouseStock, ({ one }) => ({
  warehouse: one(warehouses, { fields: [warehouseStock.warehouseid], references: [warehouses.id] }),
  section:   one(warehouseSections, { fields: [warehouseStock.sectionid], references: [warehouseSections.id] }),
  drug:      one(drugs, { fields: [warehouseStock.drugid], references: [drugs.drugid] }),
}));

export const itemsRelations = relations(items, ({ one, many }) => ({
  workspace:          one(workspaces,  { fields: [items.workspaceid], references: [workspaces.workspaceid] }),
  supplier:           one(suppliers,   { fields: [items.supplierid],  references: [suppliers.supplierid] }),
  drug:               one(drugs,       { fields: [items.drugid],      references: [drugs.drugid] }),
  batches:            many(itemBatches),
  inventoryStock:     many(inventoryStock),
  stockTransactions:  many(stockTransactions),
  unitConversions:    many(unitConversions),
  storeStock:         many(storeStock),
  storeTransactions:  many(storeTransactions),
  storeRequisitions:  many(storeRequisitions),
  controlledDrugLog:  many(controlledDrugLog),
  reagentAssignments: many(reagentAssignments),
  labConsumptionLog:  many(labConsumptionLog),
  batchQuarantine:    many(batchQuarantine),
}));

export const itemBatchesRelations = relations(itemBatches, ({ one, many }) => ({
  item:              one(items, { fields: [itemBatches.itemid], references: [items.id] }),
  warehouse:         one(warehouses, { fields: [itemBatches.warehouseid], references: [warehouses.id] }),
  inventoryStock:    many(inventoryStock),
  stockTransactions: many(stockTransactions),
  storeStock:        many(storeStock),
  storeTransactions: many(storeTransactions),
  controlledDrugLog: many(controlledDrugLog),
  labConsumptionLog: many(labConsumptionLog),
  quarantine:        many(batchQuarantine),
}));

export const inventoryStockRelations = relations(inventoryStock, ({ one }) => ({
  item:      one(items,      { fields: [inventoryStock.itemid],      references: [items.id] }),
  warehouse: one(warehouses, { fields: [inventoryStock.warehouseid], references: [warehouses.id] }),
  batch:     one(itemBatches,{ fields: [inventoryStock.batchid],     references: [itemBatches.id] }),
}));

export const stockTransactionsRelations = relations(stockTransactions, ({ one }) => ({
  item:      one(items,      { fields: [stockTransactions.itemid],      references: [items.id] }),
  warehouse: one(warehouses, { fields: [stockTransactions.warehouseid], references: [warehouses.id] }),
  batch:     one(itemBatches,{ fields: [stockTransactions.batchid],     references: [itemBatches.id] }),
}));

export const storesRelations = relations(stores, ({ one, many }) => ({
  workspace:         one(workspaces, { fields: [stores.workspaceid], references: [workspaces.workspaceid] }),
  warehouse:         one(warehouses, { fields: [stores.warehouseid], references: [warehouses.id] }),
  stock:             many(storeStock),
  transactions:      many(storeTransactions),
  requisitions:      many(storeRequisitions),
  controlledDrugLog: many(controlledDrugLog),
  labConsumptionLog: many(labConsumptionLog),
}));

export const storeStockRelations = relations(storeStock, ({ one }) => ({
  store: one(stores,      { fields: [storeStock.storeid],  references: [stores.id] }),
  item:  one(items,       { fields: [storeStock.itemid],   references: [items.id] }),
  batch: one(itemBatches, { fields: [storeStock.batchid],  references: [itemBatches.id] }),
}));

export const storeTransactionsRelations = relations(storeTransactions, ({ one }) => ({
  store: one(stores,      { fields: [storeTransactions.storeid],  references: [stores.id] }),
  item:  one(items,       { fields: [storeTransactions.itemid],   references: [items.id] }),
  batch: one(itemBatches, { fields: [storeTransactions.batchid],  references: [itemBatches.id] }),
}));

export const storeRequisitionsRelations = relations(storeRequisitions, ({ one }) => ({
  store:     one(stores,     { fields: [storeRequisitions.storeid],     references: [stores.id] }),
  warehouse: one(warehouses, { fields: [storeRequisitions.warehouseid], references: [warehouses.id] }),
  item:      one(items,      { fields: [storeRequisitions.itemid],      references: [items.id] }),
}));

export const controlledDrugLogRelations = relations(controlledDrugLog, ({ one }) => ({
  store: one(stores,      { fields: [controlledDrugLog.storeid],  references: [stores.id] }),
  item:  one(items,       { fields: [controlledDrugLog.itemid],   references: [items.id] }),
  batch: one(itemBatches, { fields: [controlledDrugLog.batchid],  references: [itemBatches.id] }),
}));

export const reagentAssignmentsRelations = relations(reagentAssignments, ({ one, many }) => ({
  item:             one(items, { fields: [reagentAssignments.itemid], references: [items.id] }),
  consumptionLogs:  many(labConsumptionLog),
}));

export const labConsumptionLogRelations = relations(labConsumptionLog, ({ one }) => ({
  assignment: one(reagentAssignments, { fields: [labConsumptionLog.assignmentid], references: [reagentAssignments.id] }),
  item:       one(items,              { fields: [labConsumptionLog.itemid],        references: [items.id] }),
  store:      one(stores,             { fields: [labConsumptionLog.storeid],       references: [stores.id] }),
  batch:      one(itemBatches,        { fields: [labConsumptionLog.batchid],       references: [itemBatches.id] }),
}));

export const batchQuarantineRelations = relations(batchQuarantine, ({ one }) => ({
  batch: one(itemBatches, { fields: [batchQuarantine.batchid], references: [itemBatches.id] }),
  item:  one(items,       { fields: [batchQuarantine.itemid],  references: [items.id] }),
}));

export const unitConversionsRelations = relations(unitConversions, ({ one }) => ({
  item: one(items, { fields: [unitConversions.itemid], references: [items.id] }),
}));
