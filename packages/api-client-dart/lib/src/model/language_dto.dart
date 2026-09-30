//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'language_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class LanguageDto {
  /// Returns a new [LanguageDto] instance.
  LanguageDto({
    required this.code,

    required this.name,

    required this.nativeName,

    required this.direction,
  });

  /// e.g. \"ur\"
  @JsonKey(name: r'code', required: true, includeIfNull: false)
  final String code;

  /// English name, e.g. \"Urdu\"
  @JsonKey(name: r'name', required: true, includeIfNull: false)
  final String name;

  /// Name in the language itself, e.g. \"اردو\"
  @JsonKey(name: r'nativeName', required: true, includeIfNull: false)
  final String nativeName;

  @JsonKey(
    name: r'direction',
    required: true,
    includeIfNull: false,
    unknownEnumValue: LanguageDtoDirectionEnum.unknownDefaultOpenApi,
  )
  final LanguageDtoDirectionEnum direction;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is LanguageDto &&
          other.code == code &&
          other.name == name &&
          other.nativeName == nativeName &&
          other.direction == direction;

  @override
  int get hashCode =>
      code.hashCode + name.hashCode + nativeName.hashCode + direction.hashCode;

  factory LanguageDto.fromJson(Map<String, dynamic> json) =>
      _$LanguageDtoFromJson(json);

  Map<String, dynamic> toJson() => _$LanguageDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}

enum LanguageDtoDirectionEnum {
  @JsonValue(r'LTR')
  LTR(r'LTR'),
  @JsonValue(r'RTL')
  RTL(r'RTL'),
  @JsonValue(r'unknown_default_open_api')
  unknownDefaultOpenApi(r'unknown_default_open_api');

  const LanguageDtoDirectionEnum(this.value);

  final String value;

  @override
  String toString() => value;
}
