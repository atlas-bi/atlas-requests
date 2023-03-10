import type { Password, User } from "@prisma/client";
import bcrypt from "bcryptjs";

import { prisma } from "~/db.server";

export type { User, Group } from "@prisma/client";

export async function getUserById(id: User["id"]) {
  return prisma.user.findUnique({ where: { id }, include: { groups: true } });
}

export async function getUserByEmail(email: User["email"]) {
  return prisma.user.findUnique({ where: { email } });
}

export async function createUser(email: User["email"]) {
  return prisma.user.create({
    data: {
      email,
    },
  });
}

export async function createGroup(name: Group["name"]) {
  return await prisma.group.create({
    data: {
      name,
    },
  });
}
export async function getGroupByName(name: Group["name"]) {
  return await prisma.group.findUnique({ where: { name } });
}

export async function getOrCreateGroup(name: Group["name"]) {
  let group = await getGroupByName(name);

  if (group) return group;

  return await createGroup(name);
}

export async function getOrCreateUser(email: User["email"]) {
  let user = await getUserByEmail(email);
  if (user) return user;

  return await createUser(email);
}

export async function updateUserProps(
  email: User["email"],
  firstName: User["firstName"],
  lastName: User["lastName"],
  groups: Groups["name"][]
) {
  // create group if not existing
  // let groupDetails = []
  // let x = await groups.forEach(async (group) => groupDetails.push(await getOrCreateGroup(group)))
  // // console.log('x', groupDetails)
  await getOrCreateUser(email);

  groups = await Promise.all(
    groups.map(async (group) => await getOrCreateGroup(group))
  );

  const existing_groups = await prisma.user.findUnique({
    where: { email },
    select: { groups: { select: { id: true } } },
  });

  const new_group_ids = groups.map((group) => Number(group.id));
  const removed_groups = existing_groups.groups
    .filter((group) => {
      if (!new_group_ids.includes(group.id)) {
        return true;
      }
    })
    .map((group) => {
      return { id: group.id };
    });

  return await prisma.user.update({
    where: { email: email },
    data: {
      firstName: firstName,
      lastName: lastName,
      groups: {
        connect: groups.map((group) => {
          return { id: group.id };
        }),
        disconnect: removed_groups,
      },
    },
  });

  // console.log(email, firstName, lastName);
  // console.log(groups);
}

export async function deleteUserByEmail(email: User["email"]) {
  return prisma.user.delete({ where: { email } });
}
