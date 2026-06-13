CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"sku" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"category" varchar(100) NOT NULL,
	"zone" varchar(100) NOT NULL,
	"assigned_shelf" varchar(20) NOT NULL,
	"current_shelf" varchar(20) NOT NULL,
	"status" varchar(20) DEFAULT 'verified' NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "products_sku_unique" UNIQUE("sku")
);
