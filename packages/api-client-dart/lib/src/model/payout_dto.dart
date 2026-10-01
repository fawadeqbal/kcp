//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'payout_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class PayoutDto {
  /// Returns a new [PayoutDto] instance.
  PayoutDto({
    required this.status,

    required this.id,

    required this.reference,

    required this.childId,

    required this.childNickname,

    required this.currency,

    required this.amountMinor,

    required this.withheldMinor,

    required this.netMinor,

    required this.accountLast4,

    required this.createdAt,

    required this.paidAt,

    required this.canConfirm,
  });

  @JsonKey(
    name: r'status',
    required: true,
    includeIfNull: false,
    unknownEnumValue: PayoutDtoStatusEnum.unknownDefaultOpenApi,
  )
  final PayoutDtoStatusEnum status;

  @JsonKey(name: r'id', required: true, includeIfNull: false)
  final String id;

  /// \"PO-0012\".
  @JsonKey(name: r'reference', required: true, includeIfNull: false)
  final String reference;

  @JsonKey(name: r'childId', required: true, includeIfNull: false)
  final String childId;

  @JsonKey(name: r'childNickname', required: true, includeIfNull: false)
  final String childNickname;

  @JsonKey(name: r'currency', required: true, includeIfNull: false)
  final String currency;

  @JsonKey(name: r'amountMinor', required: true, includeIfNull: false)
  final num amountMinor;

  @JsonKey(name: r'withheldMinor', required: true, includeIfNull: false)
  final num withheldMinor;

  @JsonKey(name: r'netMinor', required: true, includeIfNull: false)
  final num netMinor;

  /// The parent's account it goes to (parents only).
  @JsonKey(name: r'accountLast4', required: true, includeIfNull: true)
  final String? accountLast4;

  @JsonKey(name: r'createdAt', required: true, includeIfNull: false)
  final DateTime createdAt;

  @JsonKey(name: r'paidAt', required: true, includeIfNull: true)
  final DateTime? paidAt;

  /// The parent can confirm (or decline) it now.
  @JsonKey(name: r'canConfirm', required: true, includeIfNull: false)
  final bool canConfirm;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is PayoutDto &&
          other.status == status &&
          other.id == id &&
          other.reference == reference &&
          other.childId == childId &&
          other.childNickname == childNickname &&
          other.currency == currency &&
          other.amountMinor == amountMinor &&
          other.withheldMinor == withheldMinor &&
          other.netMinor == netMinor &&
          other.accountLast4 == accountLast4 &&
          other.createdAt == createdAt &&
          other.paidAt == paidAt &&
          other.canConfirm == canConfirm;

  @override
  int get hashCode =>
      status.hashCode +
      id.hashCode +
      reference.hashCode +
      childId.hashCode +
      childNickname.hashCode +
      currency.hashCode +
      amountMinor.hashCode +
      withheldMinor.hashCode +
      netMinor.hashCode +
      (accountLast4 == null ? 0 : accountLast4.hashCode) +
      createdAt.hashCode +
      (paidAt == null ? 0 : paidAt.hashCode) +
      canConfirm.hashCode;

  factory PayoutDto.fromJson(Map<String, dynamic> json) =>
      _$PayoutDtoFromJson(json);

  Map<String, dynamic> toJson() => _$PayoutDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}

enum PayoutDtoStatusEnum {
  @JsonValue(r'AWAITING_PARENT')
  AWAITING_PARENT(r'AWAITING_PARENT'),
  @JsonValue(r'CONFIRMED')
  CONFIRMED(r'CONFIRMED'),
  @JsonValue(r'SENDING')
  SENDING(r'SENDING'),
  @JsonValue(r'SENT')
  SENT(r'SENT'),
  @JsonValue(r'PAID')
  PAID(r'PAID'),
  @JsonValue(r'FAILED')
  FAILED(r'FAILED'),
  @JsonValue(r'CANCELLED')
  CANCELLED(r'CANCELLED'),
  @JsonValue(r'unknown_default_open_api')
  unknownDefaultOpenApi(r'unknown_default_open_api');

  const PayoutDtoStatusEnum(this.value);

  final String value;

  @override
  String toString() => value;
}
