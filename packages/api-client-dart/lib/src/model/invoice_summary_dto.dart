//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'invoice_summary_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class InvoiceSummaryDto {
  /// Returns a new [InvoiceSummaryDto] instance.
  InvoiceSummaryDto({
    required this.id,

    required this.number,

    required this.status,

    required this.currency,

    required this.amountMinor,

    required this.periodStart,

    required this.periodEnd,

    required this.issuedAt,

    required this.paidAt,
  });

  @JsonKey(name: r'id', required: true, includeIfNull: false)
  final String id;

  /// \"KCP-000042\"
  @JsonKey(name: r'number', required: true, includeIfNull: false)
  final String number;

  @JsonKey(
    name: r'status',
    required: true,
    includeIfNull: false,
    unknownEnumValue: InvoiceSummaryDtoStatusEnum.unknownDefaultOpenApi,
  )
  final InvoiceSummaryDtoStatusEnum status;

  @JsonKey(name: r'currency', required: true, includeIfNull: false)
  final String currency;

  @JsonKey(name: r'amountMinor', required: true, includeIfNull: false)
  final num amountMinor;

  @JsonKey(name: r'periodStart', required: true, includeIfNull: false)
  final DateTime periodStart;

  @JsonKey(name: r'periodEnd', required: true, includeIfNull: false)
  final DateTime periodEnd;

  @JsonKey(name: r'issuedAt', required: true, includeIfNull: false)
  final DateTime issuedAt;

  @JsonKey(name: r'paidAt', required: true, includeIfNull: true)
  final DateTime? paidAt;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is InvoiceSummaryDto &&
          other.id == id &&
          other.number == number &&
          other.status == status &&
          other.currency == currency &&
          other.amountMinor == amountMinor &&
          other.periodStart == periodStart &&
          other.periodEnd == periodEnd &&
          other.issuedAt == issuedAt &&
          other.paidAt == paidAt;

  @override
  int get hashCode =>
      id.hashCode +
      number.hashCode +
      status.hashCode +
      currency.hashCode +
      amountMinor.hashCode +
      periodStart.hashCode +
      periodEnd.hashCode +
      issuedAt.hashCode +
      (paidAt == null ? 0 : paidAt.hashCode);

  factory InvoiceSummaryDto.fromJson(Map<String, dynamic> json) =>
      _$InvoiceSummaryDtoFromJson(json);

  Map<String, dynamic> toJson() => _$InvoiceSummaryDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}

enum InvoiceSummaryDtoStatusEnum {
  @JsonValue(r'OPEN')
  OPEN(r'OPEN'),
  @JsonValue(r'PAID')
  PAID(r'PAID'),
  @JsonValue(r'VOID')
  VOID(r'VOID'),
  @JsonValue(r'REFUNDED')
  REFUNDED(r'REFUNDED'),
  @JsonValue(r'unknown_default_open_api')
  unknownDefaultOpenApi(r'unknown_default_open_api');

  const InvoiceSummaryDtoStatusEnum(this.value);

  final String value;

  @override
  String toString() => value;
}
