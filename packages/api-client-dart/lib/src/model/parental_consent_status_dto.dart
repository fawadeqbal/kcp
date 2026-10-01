//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'parental_consent_status_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class ParentalConsentStatusDto {
  /// Returns a new [ParentalConsentStatusDto] instance.
  ParentalConsentStatusDto({
    required this.status,

    required this.method,

    required this.methods,

    required this.rejectReason,

    required this.submittedAt,

    required this.cardsAvailable,

    required this.deleteAfter,
  });

  /// NOT_NEEDED: the child is 13 or older, or was set up before this was required.
  @JsonKey(
    name: r'status',
    required: true,
    includeIfNull: false,
    unknownEnumValue: ParentalConsentStatusDtoStatusEnum.unknownDefaultOpenApi,
  )
  final ParentalConsentStatusDtoStatusEnum status;

  /// The method of the latest attempt, if the parent picked one.
  @JsonKey(
    name: r'method',
    required: true,
    includeIfNull: true,
    unknownEnumValue: ParentalConsentStatusDtoMethodEnum.unknownDefaultOpenApi,
  )
  final ParentalConsentStatusDtoMethodEnum? method;

  /// The methods the child's country accepts, in the order to offer them.
  @JsonKey(
    name: r'methods',
    required: true,
    includeIfNull: false,
    unknownEnumValue: ParentalConsentStatusDtoMethodsEnum.unknownDefaultOpenApi,
  )
  final List<ParentalConsentStatusDtoMethodsEnum> methods;

  /// Staff's reason when a signed form was rejected.
  @JsonKey(name: r'rejectReason', required: true, includeIfNull: true)
  final String? rejectReason;

  @JsonKey(name: r'submittedAt', required: true, includeIfNull: true)
  final DateTime? submittedAt;

  /// Card checks need card payments to be available.
  @JsonKey(name: r'cardsAvailable', required: true, includeIfNull: false)
  final bool cardsAvailable;

  /// When the account is deleted if consent isn't finished (pending children).
  @JsonKey(name: r'deleteAfter', required: true, includeIfNull: true)
  final DateTime? deleteAfter;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ParentalConsentStatusDto &&
          other.status == status &&
          other.method == method &&
          other.methods == methods &&
          other.rejectReason == rejectReason &&
          other.submittedAt == submittedAt &&
          other.cardsAvailable == cardsAvailable &&
          other.deleteAfter == deleteAfter;

  @override
  int get hashCode =>
      status.hashCode +
      (method == null ? 0 : method.hashCode) +
      methods.hashCode +
      (rejectReason == null ? 0 : rejectReason.hashCode) +
      (submittedAt == null ? 0 : submittedAt.hashCode) +
      cardsAvailable.hashCode +
      (deleteAfter == null ? 0 : deleteAfter.hashCode);

  factory ParentalConsentStatusDto.fromJson(Map<String, dynamic> json) =>
      _$ParentalConsentStatusDtoFromJson(json);

  Map<String, dynamic> toJson() => _$ParentalConsentStatusDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}

/// NOT_NEEDED: the child is 13 or older, or was set up before this was required.
enum ParentalConsentStatusDtoStatusEnum {
  @JsonValue(r'PENDING')
  PENDING(r'PENDING'),
  @JsonValue(r'SUBMITTED')
  SUBMITTED(r'SUBMITTED'),
  @JsonValue(r'EXPIRED')
  EXPIRED(r'EXPIRED'),
  @JsonValue(r'VERIFIED')
  VERIFIED(r'VERIFIED'),
  @JsonValue(r'REJECTED')
  REJECTED(r'REJECTED'),
  @JsonValue(r'NOT_NEEDED')
  NOT_NEEDED(r'NOT_NEEDED'),
  @JsonValue(r'unknown_default_open_api')
  unknownDefaultOpenApi(r'unknown_default_open_api');

  const ParentalConsentStatusDtoStatusEnum(this.value);

  final String value;

  @override
  String toString() => value;
}

/// The method of the latest attempt, if the parent picked one.
enum ParentalConsentStatusDtoMethodEnum {
  @JsonValue(r'SIGNED_FORM')
  SIGNED_FORM(r'SIGNED_FORM'),
  @JsonValue(r'EMAIL_PLUS')
  EMAIL_PLUS(r'EMAIL_PLUS'),
  @JsonValue(r'CARD_CHECK')
  CARD_CHECK(r'CARD_CHECK'),
  @JsonValue(r'unknown_default_open_api')
  unknownDefaultOpenApi(r'unknown_default_open_api');

  const ParentalConsentStatusDtoMethodEnum(this.value);

  final String value;

  @override
  String toString() => value;
}

enum ParentalConsentStatusDtoMethodsEnum {
  @JsonValue(r'SIGNED_FORM')
  SIGNED_FORM(r'SIGNED_FORM'),
  @JsonValue(r'EMAIL_PLUS')
  EMAIL_PLUS(r'EMAIL_PLUS'),
  @JsonValue(r'CARD_CHECK')
  CARD_CHECK(r'CARD_CHECK'),
  @JsonValue(r'unknown_default_open_api')
  unknownDefaultOpenApi(r'unknown_default_open_api');

  const ParentalConsentStatusDtoMethodsEnum(this.value);

  final String value;

  @override
  String toString() => value;
}
