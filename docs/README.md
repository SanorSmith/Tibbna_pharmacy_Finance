# IQMed Documentation

## Feature Documentation

### Quick Links

#### Prescription Feature
1. **[PRESCRIPTION_FORM.md](./PRESCRIPTION_FORM.md)** - Complete technical documentation
   - openEHR compliance details
   - API reference and examples
   - Data models and interfaces
   - Terminology support
   - Integration guidelines
   - Testing and troubleshooting

2. **[PRESCRIPTION_IMPLEMENTATION_SUMMARY.md](./PRESCRIPTION_IMPLEMENTATION_SUMMARY.md)** - Implementation overview
   - Git commit history
   - Feature checklist
   - Migration notes
   - Future roadmap
   - Team notes

#### Test Orders Feature
3. **[TEST_ORDERS.md](./TEST_ORDERS.md)** - Laboratory test orders documentation
   - Complete feature overview
   - API reference and examples
   - Data models and interfaces
   - Laboratory types and test examples
   - Workflow integration
   - Testing and troubleshooting

#### Imaging Feature
4. **[IMAGING.md](./IMAGING.md)** - Imaging requests and results documentation
   - Complete feature overview
   - openEHR compliance details
   - API reference and examples
   - Data models and interfaces
   - Imaging modalities and examples
   - Radiology report structure
   - Workflow integration
   - Testing and troubleshooting

#### Clinical Notes Feature
5. **[CLINICAL_NOTES.md](./CLINICAL_NOTES.md)** - Clinical notes with SOAP format documentation
   - Complete feature overview
   - openEHR compliance (EVALUATION.clinical_synopsis)
   - SOAP format explanation and examples
   - User interface and workflow
   - Data model and API endpoints
   - Authorization and role-based access
   - Note types and use cases
   - Usage guide for physicians
   - Clinical documentation best practices

#### Production Deployment
6. **[OPENEHR_PRODUCTION_DEPLOYMENT.md](./OPENEHR_PRODUCTION_DEPLOYMENT.md)** - EHRbase production deployment guide
   - Current state vs production requirements
   - EHRbase architecture and setup
   - Data model enhancements for full openEHR compliance
   - Archetype implementation and registration
   - Composition structure with complete examples
   - Terminology integration (SNOMED CT, LOINC, ICD-10)
   - API integration layer
   - Migration strategy (4-phase approach)
   - Security & compliance (GDPR, HIPAA)
   - Testing & validation
   - Performance optimization
   - Monitoring & maintenance

#### Project Documentation
7. **[../CHANGELOG.md](../CHANGELOG.md)** - Version history
   - Release notes
   - Breaking changes
   - Feature additions

### Getting Started

#### For Developers
- **Prescriptions**: Start with `PRESCRIPTION_FORM.md` for technical details
- **Test Orders**: Start with `TEST_ORDERS.md` for complete feature documentation
- **Imaging**: Start with `IMAGING.md` for imaging requests and results
- **Implementation**: Review `PRESCRIPTION_IMPLEMENTATION_SUMMARY.md` for patterns

#### For Project Managers
- Read `PRESCRIPTION_IMPLEMENTATION_SUMMARY.md` for overview
- Check `TEST_ORDERS.md` for test orders feature scope
- Check `IMAGING.md` for imaging feature scope
- Review `CHANGELOG.md` for version history

#### For Users
- Refer to UI sections in `PRESCRIPTION_FORM.md` for prescriptions
- Refer to UI sections in `TEST_ORDERS.md` for test orders
- Refer to UI sections in `IMAGING.md` for imaging requests and results
- Check workflow sections for clinical processes

### Feature Status

✅ **Completed** (v1.0.0 - Nov 17, 2025)
- openEHR-compliant prescription form
- API endpoints with authorization
- Simplified UI with essential fields
- Laboratory test orders feature
- Test order form with 5 lab types
- Priority and status management
- Imaging requests and results feature
- Support for multiple imaging modalities
- Professional radiology report format
- Comprehensive documentation for all features

### Standards Compliance

#### Prescriptions
- **openEHR**: Medication Order archetype v3
- **Terminologies**: SNOMED CT, ICD-10, RxNorm, dm+d, AMT
- **Security**: Role-based access control (doctor only)

#### Test Orders
- **Laboratory Types**: Clinic chemistry, Haematology, Microbiology, Immunology, X-Ray
- **Priority Levels**: Routine, Urgent, STAT
- **Security**: Role-based access control (doctor creates, doctor/nurse view)

#### Imaging
- **openEHR**: Imaging exam request and result archetypes
- **Modalities**: X-Ray, CT, MRI, Ultrasound, Nuclear Medicine
- **Urgency Levels**: Routine, Urgent, Emergency
- **Security**: Role-based access control (doctor creates, doctor/nurse view)

### Support

For questions:
1. Check the relevant documentation file
2. Review git commit messages
3. Consult the CHANGELOG
4. Contact the development team
