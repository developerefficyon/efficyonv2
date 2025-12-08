-- Add onboarding completion flag to profiles
alter table public.profiles
add column if not exists onboarding_completed boolean default false;

create index if not exists idx_profiles_onboarding_completed
on public.profiles(onboarding_completed);

{
  "cells": [],
  "metadata": {
    "language_info": {
      "name": "python"
    }
  },
  "nbformat": 4,
  "nbformat_minor": 2
}