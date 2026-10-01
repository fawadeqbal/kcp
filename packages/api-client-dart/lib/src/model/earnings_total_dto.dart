//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'earnings_total_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class EarningsTotalDto {
  /// Returns a new [EarningsTotalDto] instance.
  EarningsTotalDto({
    required this.currency,

    required this.earnedMinor,

    required this.heldMinor,

    required this.payableMinor,

    required this.paidMinor,

    required this.withheldMinor,
  });

  @JsonKey(name: r'currency', required: true, includeIfNull: false)
  final String currency;

  /// Earned on accepted, paid work, all time.
  @JsonKey(name: r'earnedMinor', required: true, includeIfNull: false)
  final num earnedMinor;

  /// In the hold period.
  @JsonKey(name: r'heldMinor', required: true, includeIfNull: false)
  final num heldMinor;

  /// Ready for the next payout.
  @JsonKey(name: r'payableMinor', required: true, includeIfNull: false)
  final num payableMinor;

  /// Paid out to the parent.
  @JsonKey(name: r'paidMinor', required: true, includeIfNull: false)
  final num paidMinor;

  /// Withheld for tax from payouts.
  @JsonKey(name: r'withheldMinor', required: true, includeIfNull: false)
  final num withheldMinor;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is EarningsTotalDto &&
          other.currency == currency &&
          other.earnedMinor == earnedMinor &&
          other.heldMinor == heldMinor &&
          other.payableMinor == payableMinor &&
          other.paidMinor == paidMinor &&
          other.withheldMinor == withheldMinor;

  @override
  int get hashCode =>
      currency.hashCode +
      earnedMinor.hashCode +
      heldMinor.hashCode +
      payableMinor.hashCode +
      paidMinor.hashCode +
      withheldMinor.hashCode;

  factory EarningsTotalDto.fromJson(Map<String, dynamic> json) =>
      _$EarningsTotalDtoFromJson(json);

  Map<String, dynamic> toJson() => _$EarningsTotalDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}
