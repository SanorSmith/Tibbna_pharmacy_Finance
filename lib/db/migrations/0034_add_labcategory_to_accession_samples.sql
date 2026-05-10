ALTER TABLE accession_samples ADD COLUMN labcategory text;

CREATE INDEX IF NOT EXISTS accession_samples_labcategory_idx ON accession_samples(labcategory);
