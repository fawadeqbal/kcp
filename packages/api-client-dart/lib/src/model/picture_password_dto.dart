//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'picture_password_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class PicturePasswordDto {
  /// Returns a new [PicturePasswordDto] instance.
  PicturePasswordDto({required this.pictures});

  /// Four picture keys in order (see PICTURE_KEYS), or null to remove the picture password.
  @JsonKey(
    name: r'pictures',
    required: true,
    includeIfNull: true,
    unknownEnumValue: PicturePasswordDtoPicturesEnum.unknownDefaultOpenApi,
  )
  final List<PicturePasswordDtoPicturesEnum>? pictures;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is PicturePasswordDto && other.pictures == pictures;

  @override
  int get hashCode => (pictures == null ? 0 : pictures.hashCode);

  factory PicturePasswordDto.fromJson(Map<String, dynamic> json) =>
      _$PicturePasswordDtoFromJson(json);

  Map<String, dynamic> toJson() => _$PicturePasswordDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}

enum PicturePasswordDtoPicturesEnum {
  @JsonValue(r'cat')
  cat(r'cat'),
  @JsonValue(r'dog')
  dog(r'dog'),
  @JsonValue(r'fish')
  fish(r'fish'),
  @JsonValue(r'bird')
  bird(r'bird'),
  @JsonValue(r'rabbit')
  rabbit(r'rabbit'),
  @JsonValue(r'sun')
  sun(r'sun'),
  @JsonValue(r'moon')
  moon(r'moon'),
  @JsonValue(r'star')
  star(r'star'),
  @JsonValue(r'tree')
  tree(r'tree'),
  @JsonValue(r'flower')
  flower(r'flower'),
  @JsonValue(r'apple')
  apple(r'apple'),
  @JsonValue(r'car')
  car(r'car'),
  @JsonValue(r'unknown_default_open_api')
  unknownDefaultOpenApi(r'unknown_default_open_api');

  const PicturePasswordDtoPicturesEnum(this.value);

  final String value;

  @override
  String toString() => value;
}
