//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'pairing_info_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class PairingInfoDto {
  /// Returns a new [PairingInfoDto] instance.
  PairingInfoDto({
    required this.device,

    required this.createdAt,

    required this.expiresAt,
  });

  /// The browser or app and system, e.g. \"Chrome on Android\".
  @JsonKey(name: r'device', required: true, includeIfNull: false)
  final String device;

  @JsonKey(name: r'createdAt', required: true, includeIfNull: false)
  final DateTime createdAt;

  @JsonKey(name: r'expiresAt', required: true, includeIfNull: false)
  final DateTime expiresAt;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is PairingInfoDto &&
          other.device == device &&
          other.createdAt == createdAt &&
          other.expiresAt == expiresAt;

  @override
  int get hashCode => device.hashCode + createdAt.hashCode + expiresAt.hashCode;

  factory PairingInfoDto.fromJson(Map<String, dynamic> json) =>
      _$PairingInfoDtoFromJson(json);

  Map<String, dynamic> toJson() => _$PairingInfoDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}
