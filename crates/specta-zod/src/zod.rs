use std::{borrow::Cow, fmt::Write, path::Path};

use specta::{
    TypeCollection,
    datatype::{
        DataType, DataTypeReference, EnumRepr, EnumType, EnumVariants, Field, List, Map,
        NamedDataType, PrimitiveType, StructFields, StructType, TupleType,
    },
};

use crate::Error;

pub struct Zod {
    pub header: Cow<'static, str>,
}

impl Default for Zod {
    fn default() -> Self {
        Self {
            header: r#"import { z } from "zod";
import { jsonObject } from "./shared";

"#
            .into(),
        }
    }
}

impl Zod {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn header(mut self, header: impl Into<Cow<'static, str>>) -> Self {
        self.header = header.into();
        self
    }

    pub fn export(&self, types: &TypeCollection) -> Result<String, Error> {
        let mut output = self.header.to_string();

        for (_, ndt) in types {
            export_named_datatype(&mut output, types, ndt)?;
            output.push('\n');
        }

        Ok(output)
    }

    pub fn export_to(&self, path: impl AsRef<Path>, types: &TypeCollection) -> Result<(), Error> {
        let content = self.export(types)?;
        std::fs::write(path, content)?;
        Ok(())
    }
}

fn export_named_datatype(
    s: &mut String,
    types: &TypeCollection,
    ndt: &NamedDataType,
) -> Result<(), Error> {
    let name = ndt.name();
    write!(s, "export const {}Schema = ", to_camel_case(name))?;
    datatype(s, types, &ndt.inner, false)?;
    s.push_str(";\n");

    writeln!(
        s,
        "export type {} = z.infer<typeof {}Schema>;",
        name,
        to_camel_case(name)
    )?;

    Ok(())
}

fn datatype(
    s: &mut String,
    types: &TypeCollection,
    dt: &DataType,
    is_json: bool,
) -> Result<(), Error> {
    match dt {
        DataType::Any => s.push_str("z.any()"),
        DataType::Unknown => s.push_str("z.unknown()"),
        DataType::Primitive(p) => primitive(s, p)?,
        DataType::Literal(l) => literal(s, l)?,
        DataType::List(l) => list(s, types, l, is_json)?,
        DataType::Map(m) => map(s, types, m, is_json)?,
        DataType::Nullable(inner) => nullable(s, types, inner)?,
        DataType::Struct(st) => struct_type(s, types, st)?,
        DataType::Enum(e) => enum_type(s, types, e)?,
        DataType::Tuple(t) => tuple(s, types, t, is_json)?,
        DataType::Reference(r) => reference(s, types, r)?,
        DataType::Generic(g) => s.push_str(&g.to_string()),
    }
    Ok(())
}

fn literal(s: &mut String, l: &specta::datatype::LiteralType) -> Result<(), Error> {
    use specta::datatype::LiteralType;

    match l {
        LiteralType::i8(v) => write!(s, "z.literal({})", v)?,
        LiteralType::i16(v) => write!(s, "z.literal({})", v)?,
        LiteralType::i32(v) => write!(s, "z.literal({})", v)?,
        LiteralType::u8(v) => write!(s, "z.literal({})", v)?,
        LiteralType::u16(v) => write!(s, "z.literal({})", v)?,
        LiteralType::u32(v) => write!(s, "z.literal({})", v)?,
        LiteralType::f32(v) => write!(s, "z.literal({})", v)?,
        LiteralType::f64(v) => write!(s, "z.literal({})", v)?,
        LiteralType::bool(v) => write!(s, "z.literal({})", v)?,
        LiteralType::String(v) => write!(s, "z.literal(\"{}\")", v)?,
        LiteralType::char(v) => write!(s, "z.literal(\"{}\")", v)?,
        LiteralType::None => s.push_str("z.null()"),
        _ => s.push_str("z.any()"),
    }
    Ok(())
}

fn primitive(s: &mut String, p: &PrimitiveType) -> Result<(), Error> {
    use PrimitiveType::*;

    let zod_type = match p {
        i8 | i16 | i32 | u8 | u16 | u32 | f32 | f64 | usize | isize | i64 | u64 | i128 | u128 => {
            "z.number()"
        }
        bool => "z.boolean()",
        String | char => "z.string()",
    };

    s.push_str(zod_type);
    Ok(())
}

fn list(s: &mut String, types: &TypeCollection, l: &List, is_json: bool) -> Result<(), Error> {
    if let Some(length) = l.length() {
        s.push_str("z.tuple([");
        for i in 0..length {
            if i > 0 {
                s.push_str(", ");
            }
            datatype(s, types, l.ty(), true)?;
        }
        s.push_str("])");
    } else {
        if !is_json {
            s.push_str("jsonObject(");
        }
        s.push_str("z.array(");
        datatype(s, types, l.ty(), true)?;
        s.push(')');
        if !is_json {
            s.push(')');
        }
    }
    Ok(())
}

fn map(s: &mut String, types: &TypeCollection, m: &Map, is_json: bool) -> Result<(), Error> {
    if !is_json {
        s.push_str("jsonObject(");
    }
    s.push_str("z.record(");
    datatype(s, types, m.key_ty(), true)?;
    s.push_str(", ");
    datatype(s, types, m.value_ty(), true)?;
    s.push(')');
    if !is_json {
        s.push(')');
    }
    Ok(())
}

fn nullable(s: &mut String, types: &TypeCollection, inner: &DataType) -> Result<(), Error> {
    s.push_str("z.preprocess((val) => val ?? undefined, ");
    datatype(s, types, inner, false)?;
    s.push_str(".optional())");
    Ok(())
}

fn struct_type(s: &mut String, types: &TypeCollection, st: &StructType) -> Result<(), Error> {
    match st.fields() {
        StructFields::Unit => {
            s.push_str("z.null()");
        }
        StructFields::Unnamed(unnamed) => {
            let fields: Vec<_> = unnamed
                .fields()
                .iter()
                .filter(|f| f.ty().is_some())
                .collect();
            if fields.len() == 1 {
                if let Some(ty) = fields[0].ty() {
                    datatype(s, types, ty, false)?;
                }
            } else {
                s.push_str("z.tuple([");
                for (i, field) in fields.iter().enumerate() {
                    if i > 0 {
                        s.push_str(", ");
                    }
                    if let Some(ty) = field.ty() {
                        datatype(s, types, ty, false)?;
                    }
                }
                s.push_str("])");
            }
        }
        StructFields::Named(named) => {
            s.push_str("z.object({\n");
            let fields: Vec<_> = named
                .fields()
                .iter()
                .filter(|(_, f)| f.ty().is_some())
                .collect();

            for (i, (name, field)) in fields.iter().enumerate() {
                if i > 0 {
                    s.push_str(",\n");
                }
                write!(s, "  {}: ", name)?;
                field_type(s, types, field)?;
            }

            if !fields.is_empty() {
                s.push(',');
            }
            s.push_str("\n})");
        }
    }
    Ok(())
}

fn field_type(s: &mut String, types: &TypeCollection, field: &Field) -> Result<(), Error> {
    let Some(ty) = field.ty() else {
        return Ok(());
    };

    if field.optional() {
        s.push_str("z.preprocess((val) => val ?? undefined, ");
        datatype(s, types, ty, false)?;
        s.push_str(".optional())");
    } else {
        datatype(s, types, ty, false)?;
    }

    Ok(())
}

fn enum_type(s: &mut String, types: &TypeCollection, e: &EnumType) -> Result<(), Error> {
    let variants: Vec<_> = e.variants().iter().filter(|(_, v)| !v.skip()).collect();

    if variants.is_empty() {
        s.push_str("z.never()");
        return Ok(());
    }

    let is_simple_string_enum = variants
        .iter()
        .all(|(_, v)| matches!(v.inner(), EnumVariants::Unit));

    match e.repr() {
        EnumRepr::External if is_simple_string_enum => {
            s.push_str("z.enum([");
            for (i, (name, _)) in variants.iter().enumerate() {
                if i > 0 {
                    s.push_str(", ");
                }
                write!(s, "\"{}\"", name)?;
            }
            s.push_str("])");
        }
        repr => {
            if variants.len() == 1 {
                let (name, variant) = &variants[0];
                enum_variant(s, types, name, variant.inner(), repr)?;
            } else {
                s.push_str("z.union([");
                for (i, (name, variant)) in variants.iter().enumerate() {
                    if i > 0 {
                        s.push_str(", ");
                    }
                    enum_variant(s, types, name, variant.inner(), repr)?;
                }
                s.push_str("])");
            }
        }
    }

    Ok(())
}

fn enum_variant(
    s: &mut String,
    types: &TypeCollection,
    name: &str,
    fields: &EnumVariants,
    repr: &EnumRepr,
) -> Result<(), Error> {
    match repr {
        EnumRepr::External => match fields {
            EnumVariants::Unit => {
                write!(s, "z.literal(\"{}\")", name)?;
            }
            EnumVariants::Unnamed(unnamed) => {
                let field_types: Vec<_> = unnamed
                    .fields()
                    .iter()
                    .filter(|f| f.ty().is_some())
                    .collect();
                s.push_str("z.object({ ");
                write!(s, "\"{}\": ", name)?;
                if field_types.len() == 1 {
                    if let Some(ty) = field_types[0].ty() {
                        datatype(s, types, ty, false)?;
                    }
                } else {
                    s.push_str("z.tuple([");
                    for (i, f) in field_types.iter().enumerate() {
                        if i > 0 {
                            s.push_str(", ");
                        }
                        if let Some(ty) = f.ty() {
                            datatype(s, types, ty, false)?;
                        }
                    }
                    s.push_str("])");
                }
                s.push_str(" })");
            }
            EnumVariants::Named(named) => {
                s.push_str("z.object({ ");
                write!(s, "\"{}\": z.object({{ ", name)?;
                let fields: Vec<_> = named
                    .fields()
                    .iter()
                    .filter(|(_, f)| f.ty().is_some())
                    .collect();
                for (i, (field_name, field)) in fields.iter().enumerate() {
                    if i > 0 {
                        s.push_str(", ");
                    }
                    write!(s, "{}: ", field_name)?;
                    field_type(s, types, field)?;
                }
                s.push_str(" }) })");
            }
        },
        EnumRepr::Internal { tag } => match fields {
            EnumVariants::Unit => {
                write!(s, "z.object({{ {}: z.literal(\"{}\") }})", tag, name)?;
            }
            EnumVariants::Named(named) => {
                write!(s, "z.object({{ {}: z.literal(\"{}\"), ", tag, name)?;
                let fields: Vec<_> = named
                    .fields()
                    .iter()
                    .filter(|(_, f)| f.ty().is_some())
                    .collect();
                for (i, (field_name, field)) in fields.iter().enumerate() {
                    if i > 0 {
                        s.push_str(", ");
                    }
                    write!(s, "{}: ", field_name)?;
                    field_type(s, types, field)?;
                }
                s.push_str(" })");
            }
            _ => {
                write!(s, "z.object({{ {}: z.literal(\"{}\") }})", tag, name)?;
            }
        },
        EnumRepr::Adjacent { tag, content } => match fields {
            EnumVariants::Unit => {
                write!(s, "z.object({{ {}: z.literal(\"{}\") }})", tag, name)?;
            }
            _ => {
                write!(
                    s,
                    "z.object({{ {}: z.literal(\"{}\"), {}: ",
                    tag, name, content
                )?;
                match fields {
                    EnumVariants::Unnamed(unnamed) => {
                        let field_types: Vec<_> = unnamed
                            .fields()
                            .iter()
                            .filter(|f| f.ty().is_some())
                            .collect();
                        if field_types.len() == 1 {
                            if let Some(ty) = field_types[0].ty() {
                                datatype(s, types, ty, false)?;
                            }
                        } else {
                            s.push_str("z.tuple([");
                            for (i, f) in field_types.iter().enumerate() {
                                if i > 0 {
                                    s.push_str(", ");
                                }
                                if let Some(ty) = f.ty() {
                                    datatype(s, types, ty, false)?;
                                }
                            }
                            s.push_str("])");
                        }
                    }
                    EnumVariants::Named(named) => {
                        s.push_str("z.object({ ");
                        let fields: Vec<_> = named
                            .fields()
                            .iter()
                            .filter(|(_, f)| f.ty().is_some())
                            .collect();
                        for (i, (field_name, field)) in fields.iter().enumerate() {
                            if i > 0 {
                                s.push_str(", ");
                            }
                            write!(s, "{}: ", field_name)?;
                            field_type(s, types, field)?;
                        }
                        s.push_str(" })");
                    }
                    EnumVariants::Unit => {}
                }
                s.push_str(" })");
            }
        },
        EnumRepr::Untagged => match fields {
            EnumVariants::Unit => {
                s.push_str("z.null()");
            }
            EnumVariants::Unnamed(unnamed) => {
                let field_types: Vec<_> = unnamed
                    .fields()
                    .iter()
                    .filter(|f| f.ty().is_some())
                    .collect();
                if field_types.len() == 1 {
                    if let Some(ty) = field_types[0].ty() {
                        datatype(s, types, ty, false)?;
                    }
                } else {
                    s.push_str("z.tuple([");
                    for (i, f) in field_types.iter().enumerate() {
                        if i > 0 {
                            s.push_str(", ");
                        }
                        if let Some(ty) = f.ty() {
                            datatype(s, types, ty, false)?;
                        }
                    }
                    s.push_str("])");
                }
            }
            EnumVariants::Named(named) => {
                s.push_str("z.object({ ");
                let fields: Vec<_> = named
                    .fields()
                    .iter()
                    .filter(|(_, f)| f.ty().is_some())
                    .collect();
                for (i, (field_name, field)) in fields.iter().enumerate() {
                    if i > 0 {
                        s.push_str(", ");
                    }
                    write!(s, "{}: ", field_name)?;
                    field_type(s, types, field)?;
                }
                s.push_str(" })");
            }
        },
    }

    Ok(())
}

fn tuple(
    s: &mut String,
    types: &TypeCollection,
    t: &TupleType,
    is_json: bool,
) -> Result<(), Error> {
    let elements = t.elements();
    if elements.is_empty() {
        s.push_str("z.null()");
        return Ok(());
    }

    if !is_json && elements.len() > 1 {
        s.push_str("jsonObject(");
    }
    s.push_str("z.tuple([");
    for (i, elem) in elements.iter().enumerate() {
        if i > 0 {
            s.push_str(", ");
        }
        datatype(s, types, elem, true)?;
    }
    s.push_str("])");
    if !is_json && elements.len() > 1 {
        s.push(')');
    }

    Ok(())
}

fn reference(s: &mut String, types: &TypeCollection, r: &DataTypeReference) -> Result<(), Error> {
    if let Some(ndt) = types.get(r.sid()) {
        write!(s, "{}Schema", to_camel_case(ndt.name()))?;
    }

    Ok(())
}

fn to_camel_case(name: &str) -> String {
    let mut result = String::new();
    let mut capitalize_next = false;

    for (i, c) in name.chars().enumerate() {
        if c == '_' || c == '-' {
            capitalize_next = true;
        } else if i == 0 {
            result.push(c.to_ascii_lowercase());
        } else if capitalize_next {
            result.push(c.to_ascii_uppercase());
            capitalize_next = false;
        } else {
            result.push(c);
        }
    }

    result
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde::{Deserialize, Serialize};
    use specta::Type;
    use std::collections::HashMap;

    #[derive(Type, Serialize, Deserialize)]
    struct SimpleStruct {
        name: String,
        age: i32,
        active: bool,
    }

    #[derive(Type, Serialize, Deserialize)]
    struct OptionalFields {
        required: String,
        optional: Option<String>,
        optional_num: Option<i32>,
    }

    #[derive(Type, Serialize, Deserialize)]
    struct WithArray {
        tags: Vec<String>,
        scores: Vec<i32>,
    }

    #[derive(Type, Serialize, Deserialize)]
    enum SimpleEnum {
        One,
        Two,
        Three,
    }

    #[derive(Type, Serialize, Deserialize)]
    struct NewtypeWrapper(String);

    #[derive(Type, Serialize, Deserialize)]
    struct TupleStruct(String, i32);

    #[derive(Type, Serialize, Deserialize)]
    struct WithMap {
        data: HashMap<String, i32>,
    }

    #[derive(Type, Serialize, Deserialize)]
    struct WithNestedOptional {
        nested: Option<Vec<String>>,
    }

    #[derive(Type, Serialize, Deserialize)]
    #[serde(tag = "type")]
    enum InternallyTaggedEnum {
        Variant1 { value: String },
        Variant2 { count: i32 },
    }

    #[derive(Type, Serialize, Deserialize)]
    #[serde(tag = "type", content = "data")]
    enum AdjacentlyTaggedEnum {
        Text(String),
        Number(i32),
    }

    #[derive(Type, Serialize, Deserialize)]
    #[serde(untagged)]
    enum UntaggedEnum {
        Str(String),
        Num(i32),
    }

    #[derive(Type, Serialize, Deserialize)]
    enum ExternallyTaggedEnum {
        Unit,
        WithData(String),
        WithStruct { field: i32 },
    }

    #[derive(Type, Serialize, Deserialize)]
    struct WithReference {
        simple: SimpleStruct,
    }

    #[derive(Type, Serialize, Deserialize)]
    struct WithTuple {
        pair: (String, i32),
    }

    #[derive(Type, Serialize, Deserialize)]
    struct AllPrimitives {
        a_i8: i8,
        a_i16: i16,
        a_i32: i32,
        a_i64: i64,
        a_u8: u8,
        a_u16: u16,
        a_u32: u32,
        a_u64: u64,
        a_f32: f32,
        a_f64: f64,
        a_bool: bool,
        a_string: String,
        a_char: char,
    }

    #[test]
    fn test_simple_struct() {
        let mut types = TypeCollection::default();
        types.register::<SimpleStruct>();
        let output = Zod::new().header("").export(&types).unwrap();
        insta::assert_snapshot!(output);
    }

    #[test]
    fn test_optional_fields() {
        let mut types = TypeCollection::default();
        types.register::<OptionalFields>();
        let output = Zod::new().header("").export(&types).unwrap();
        insta::assert_snapshot!(output);
    }

    #[test]
    fn test_array_fields() {
        let mut types = TypeCollection::default();
        types.register::<WithArray>();
        let output = Zod::new().header("").export(&types).unwrap();
        insta::assert_snapshot!(output);
    }

    #[test]
    fn test_simple_enum() {
        let mut types = TypeCollection::default();
        types.register::<SimpleEnum>();
        let output = Zod::new().header("").export(&types).unwrap();
        insta::assert_snapshot!(output);
    }

    #[test]
    fn test_newtype_wrapper() {
        let mut types = TypeCollection::default();
        types.register::<NewtypeWrapper>();
        let output = Zod::new().header("").export(&types).unwrap();
        insta::assert_snapshot!(output);
    }

    #[test]
    fn test_tuple_struct() {
        let mut types = TypeCollection::default();
        types.register::<TupleStruct>();
        let output = Zod::new().header("").export(&types).unwrap();
        insta::assert_snapshot!(output);
    }

    #[test]
    fn test_map_field() {
        let mut types = TypeCollection::default();
        types.register::<WithMap>();
        let output = Zod::new().header("").export(&types).unwrap();
        insta::assert_snapshot!(output);
    }

    #[test]
    fn test_nested_optional() {
        let mut types = TypeCollection::default();
        types.register::<WithNestedOptional>();
        let output = Zod::new().header("").export(&types).unwrap();
        insta::assert_snapshot!(output);
    }

    #[test]
    fn test_internally_tagged_enum() {
        let mut types = TypeCollection::default();
        types.register::<InternallyTaggedEnum>();
        let output = Zod::new().header("").export(&types).unwrap();
        insta::assert_snapshot!(output);
    }

    #[test]
    fn test_adjacently_tagged_enum() {
        let mut types = TypeCollection::default();
        types.register::<AdjacentlyTaggedEnum>();
        let output = Zod::new().header("").export(&types).unwrap();
        insta::assert_snapshot!(output);
    }

    #[test]
    fn test_untagged_enum() {
        let mut types = TypeCollection::default();
        types.register::<UntaggedEnum>();
        let output = Zod::new().header("").export(&types).unwrap();
        insta::assert_snapshot!(output);
    }

    #[test]
    fn test_externally_tagged_enum() {
        let mut types = TypeCollection::default();
        types.register::<ExternallyTaggedEnum>();
        let output = Zod::new().header("").export(&types).unwrap();
        insta::assert_snapshot!(output);
    }

    #[test]
    fn test_with_reference() {
        let mut types = TypeCollection::default();
        types.register::<WithReference>();
        let output = Zod::new().header("").export(&types).unwrap();
        insta::assert_snapshot!(output);
    }

    #[test]
    fn test_tuple_field() {
        let mut types = TypeCollection::default();
        types.register::<WithTuple>();
        let output = Zod::new().header("").export(&types).unwrap();
        insta::assert_snapshot!(output);
    }

    #[test]
    fn test_all_primitives() {
        let mut types = TypeCollection::default();
        types.register::<AllPrimitives>();
        let output = Zod::new().header("").export(&types).unwrap();
        insta::assert_snapshot!(output);
    }

    #[test]
    fn test_camel_case_conversion() {
        assert_eq!(to_camel_case("SimpleStruct"), "simpleStruct");
        assert_eq!(to_camel_case("my_struct"), "myStruct");
        assert_eq!(to_camel_case("my-struct"), "myStruct");
        assert_eq!(to_camel_case("MyStruct"), "myStruct");
        assert_eq!(to_camel_case("ABC"), "aBC");
    }

    #[test]
    fn test_custom_header() {
        let mut types = TypeCollection::default();
        types.register::<SimpleStruct>();
        let custom_header = "// Custom header\nimport { z } from 'zod';\n\n";
        let output = Zod::new().header(custom_header).export(&types).unwrap();
        insta::assert_snapshot!(output);
    }

    #[test]
    fn test_type_export() {
        let mut types = TypeCollection::default();
        types.register::<SimpleStruct>();
        let output = Zod::new().header("").export(&types).unwrap();
        insta::assert_snapshot!(output);
    }
}
