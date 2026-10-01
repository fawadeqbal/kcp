//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'pairing_start_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class PairingStartDto {
  /// Returns a new [PairingStartDto] instance.
  PairingStartDto({required this.app});

  /// Which app shows the code (the mobile app keeps its tokens itself).
  @JsonKey(
    name: r'app',
    required: true,
    includeIfNull: false,
    unknownEnumValue: PairingStartDtoAppEnum.unknownDefaultOpenApi,
  )
  final PairingStartDtoAppEnum app;

  @override
  bool operator ==(Object other) =>
      identical(this, other) || other is PairingStartDto && other.app == app;

  @override
  int get hashCode => app.hashCode;

  factory PairingStartDto.fromJson(Map<String, dynamic> json) =>
      _$PairingStartDtoFromJson(json);

  Map<String, dynamic> toJson() => _$PairingStartDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}

/// Which app shows the code (the mobile app keeps its tokens itself).
enum PairingStartDtoAppEnum {
  @JsonValue(r'web')
  web(r'web'),
  @JsonValue(r'mobile')
  mobile(r'mobile'),
  @JsonValue(r'unknown_default_open_api')
  unknownDefaultOpenApi(r'unknown_default_open_api');

  const PairingStartDtoAppEnum(this.value);

  final String value;

  @override
  String toString() => value;
}
