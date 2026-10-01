//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'pairing_status_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class PairingStatusDto {
  /// Returns a new [PairingStatusDto] instance.
  PairingStatusDto({required this.status});

  @JsonKey(
    name: r'status',
    required: true,
    includeIfNull: false,
    unknownEnumValue: PairingStatusDtoStatusEnum.unknownDefaultOpenApi,
  )
  final PairingStatusDtoStatusEnum status;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is PairingStatusDto && other.status == status;

  @override
  int get hashCode => status.hashCode;

  factory PairingStatusDto.fromJson(Map<String, dynamic> json) =>
      _$PairingStatusDtoFromJson(json);

  Map<String, dynamic> toJson() => _$PairingStatusDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}

enum PairingStatusDtoStatusEnum {
  @JsonValue(r'expired')
  expired(r'expired'),
  @JsonValue(r'waiting')
  waiting(r'waiting'),
  @JsonValue(r'approved')
  approved(r'approved'),
  @JsonValue(r'unknown_default_open_api')
  unknownDefaultOpenApi(r'unknown_default_open_api');

  const PairingStatusDtoStatusEnum(this.value);

  final String value;

  @override
  String toString() => value;
}
