//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'pairing_started_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class PairingStartedDto {
  /// Returns a new [PairingStartedDto] instance.
  PairingStartedDto({
    required this.pairingId,

    required this.code,

    required this.secret,

    required this.expiresAt,
  });

  @JsonKey(name: r'pairingId', required: true, includeIfNull: false)
  final String pairingId;

  /// Shown on the child's device (and in its QR code), e.g. \"K7MQ-4XPR\".
  @JsonKey(name: r'code', required: true, includeIfNull: false)
  final String code;

  /// Only the device that asked holds it: it proves the device when claiming.
  @JsonKey(name: r'secret', required: true, includeIfNull: false)
  final String secret;

  @JsonKey(name: r'expiresAt', required: true, includeIfNull: false)
  final DateTime expiresAt;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is PairingStartedDto &&
          other.pairingId == pairingId &&
          other.code == code &&
          other.secret == secret &&
          other.expiresAt == expiresAt;

  @override
  int get hashCode =>
      pairingId.hashCode + code.hashCode + secret.hashCode + expiresAt.hashCode;

  factory PairingStartedDto.fromJson(Map<String, dynamic> json) =>
      _$PairingStartedDtoFromJson(json);

  Map<String, dynamic> toJson() => _$PairingStartedDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}
