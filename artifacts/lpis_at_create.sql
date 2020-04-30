CREATE SEQUENCE model_at_id_seq
    INCREMENT 1
    START 7
    MINVALUE 1
    MAXVALUE 9223372036854775807
    CACHE 1;
    
CREATE TABLE model_at
(
    id integer NOT NULL DEFAULT nextval('model_at_id_seq'::regclass),
    name character varying(50) COLLATE pg_catalog."default" NOT NULL,
    ref_date date NOT NULL,
    training_time timestamp without time zone NOT NULL,
    configuration json NOT NULL,
    CONSTRAINT model_at_pkey PRIMARY KEY (id)
)
WITH (
    OIDS = FALSE
);
    
    
CREATE TABLE lpis_at
(
    ogd_id double precision NOT NULL,
    ref_date date NOT NULL,
    ctnuml4a integer NOT NULL,
    ct integer NOT NULL,
    geometry geometry(Geometry,31287) NOT NULL,
    CONSTRAINT lpis_at_pk PRIMARY KEY (ogd_id, ref_date)
)
WITH (
    OIDS = FALSE
);

CREATE TABLE classification_at
(
    parcel_id integer NOT NULL,
    ref_date date,
    model_id integer NOT NULL,
    prediction json NOT NULL,
    CONSTRAINT classification_pkey PRIMARY KEY (parcel_id, model_id),
    CONSTRAINT classification_at_parcel_id_fkey FOREIGN KEY (parcel_id, ref_date)
        REFERENCES lpis_at (ogd_id, ref_date) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
)
WITH (
    OIDS = FALSE
);
