import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { CountryRepository } from './repositories/country.repository';
import { CreateCountryDto } from './dto/create-country.dto';
import { UpdateCountryDto } from './dto/update-country.dto';

@Injectable()
export class CountriesService {
  constructor(private readonly countryRepository: CountryRepository) {}

  findAll() {
    return this.countryRepository.findAll();
  }

  private async validateCountryExists(id: string) {
    const country = await this.countryRepository.findById(id);

    if (!country) {
      throw new NotFoundException('País no encontrado.');
    }

    return country;
  }

  async findOne(id: string) {
    return this.validateCountryExists(id);
  }

  async create(createCountryDto: CreateCountryDto) {
    const countryByName = await this.countryRepository.findByName(
      createCountryDto.name,
    );

    if (countryByName) {
      throw new ConflictException('Ya existe un país con ese nombre.');
    }

    const countryByIso =
      await this.countryRepository.findByIsoCodeIncludingInactive(
        createCountryDto.isoCode,
      );

    if (countryByIso) {
      if (!countryByIso.is_active) {
        return this.countryRepository.reactivate(
          countryByIso.id,
          createCountryDto,
        );
      }

      throw new ConflictException('Ya existe un país con ese código ISO.');
    }

    return this.countryRepository.create(createCountryDto);
  }

  async update(id: string, updateCountryDto: UpdateCountryDto) {
    await this.validateCountryExists(id);

    if (updateCountryDto.name) {
      const countryByName = await this.countryRepository.findByNameExcludingId(
        updateCountryDto.name,
        id,
      );

      if (countryByName) {
        throw new ConflictException('Ya existe un país con ese nombre.');
      }
    }

    if (updateCountryDto.isoCode) {
      const countryByIso =
        await this.countryRepository.findByIsoCodeExcludingId(
          updateCountryDto.isoCode,
          id,
        );

      if (countryByIso) {
        throw new ConflictException('Ya existe un país con ese código ISO.');
      }
    }

    return this.countryRepository.update(id, updateCountryDto);
  }

  async delete(id: string) {
    await this.validateCountryExists(id);

    return this.countryRepository.delete(id);
  }
}
